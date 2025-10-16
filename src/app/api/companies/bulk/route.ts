import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyFormSchema } from '@/lib/validations'
import { z } from 'zod'

// Schema for bulk operations
const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
})

const BulkCreateSchema = z.object({
  companies: z.array(CompanyFormSchema).min(1, 'At least one company is required'),
})

const BulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: CompanyFormSchema,
  })).min(1, 'At least one update is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation } = body

    switch (operation) {
      case 'create': {
        const validation = BulkCreateSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid bulk create data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        // Process companies to handle JSON fields
        const processedCompanies = validation.data.companies.map((company: any) => {
          const processed = { ...company }
          // Handle socialMedia: convert null to undefined, empty object to undefined
          if (processed.socialMedia === null || 
              (processed.socialMedia && Object.keys(processed.socialMedia).length === 0)) {
            processed.socialMedia = undefined
          }
          // Handle themeConfig: convert null to undefined, empty object to undefined
          if (processed.themeConfig === null || 
              (processed.themeConfig && Object.keys(processed.themeConfig).length === 0)) {
            processed.themeConfig = undefined
          }
          return processed
        })

        const createdCompanies = await prisma.$transaction(
          processedCompanies.map((company) =>
            prisma.company.create({ data: company })
          )
        )

        return NextResponse.json({ 
          success: true, 
          created: createdCompanies.length,
          companies: createdCompanies 
        }, { status: 201 })
      }

      case 'update': {
        const validation = BulkUpdateSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid bulk update data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        // Process updates to handle JSON fields
        const processedUpdates = validation.data.updates.map((update: any) => {
          const processedData = { ...update.data }
          // Handle socialMedia
          if (processedData.socialMedia === null || 
              (processedData.socialMedia && Object.keys(processedData.socialMedia).length === 0)) {
            processedData.socialMedia = undefined
          }
          // Handle themeConfig
          if (processedData.themeConfig === null || 
              (processedData.themeConfig && Object.keys(processedData.themeConfig).length === 0)) {
            processedData.themeConfig = undefined
          }
          return { id: update.id, data: processedData }
        })

        const updatedCompanies = await prisma.$transaction(
          processedUpdates.map((update) =>
            prisma.company.update({
              where: { id: update.id },
              data: update.data,
            })
          )
        )

        return NextResponse.json({ 
          success: true, 
          updated: updatedCompanies.length,
          companies: updatedCompanies 
        })
      }

      case 'delete': {
        const validation = BulkDeleteSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid bulk delete data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        // Get companies to delete for logging
        const companiesToDelete = await prisma.company.findMany({
          where: { id: { in: validation.data.ids } },
          include: {
            _count: {
              select: {
                items: true,
                users: true,
                locations: true,
                expenses: true,
              },
            },
          },
        })

        if (companiesToDelete.length === 0) {
          return NextResponse.json({ error: 'No companies found to delete' }, { status: 404 })
        }

        // Delete companies (cascade delete will handle all related data)
        const deletedResult = await prisma.company.deleteMany({
          where: { id: { in: validation.data.ids } },
        })

        const totalRelatedRecords = companiesToDelete.reduce((sum, company) => 
          sum + company._count.items + company._count.users + 
          company._count.locations + company._count.expenses, 0
        )

        console.log(`Bulk deleted ${deletedResult.count} companies and ${totalRelatedRecords} related records`)

        return NextResponse.json({ 
          success: true, 
          deleted: deletedResult.count,
          relatedRecordsDeleted: totalRelatedRecords,
          companies: companiesToDelete.map(c => ({
            name: c.name,
            id: c.id,
            relatedRecords: c._count,
          }))
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Must be one of: create, update, delete' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in bulk companies operation:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'One or more company names already exist' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}