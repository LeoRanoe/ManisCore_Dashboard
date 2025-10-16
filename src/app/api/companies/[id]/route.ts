import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyFormSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: {
        id: params.id,
      },
      include: {
        items: true,
        users: true,
        locations: true,
        expenses: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = CompanyFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid company data', details: validation.error.issues }, { status: 400 })
    }

    // Process the data to handle JSON fields properly
    const processedData: any = { ...validation.data }
    
    // Handle socialMedia: convert null to undefined, empty object to undefined
    if (processedData.socialMedia === null || 
        (processedData.socialMedia && Object.keys(processedData.socialMedia).length === 0)) {
      processedData.socialMedia = undefined
    }
    
    // Handle themeConfig: convert null to undefined, empty object to undefined
    if (processedData.themeConfig === null || 
        (processedData.themeConfig && Object.keys(processedData.themeConfig).length === 0)) {
      processedData.themeConfig = undefined
    }

    const company = await prisma.company.update({
      where: {
        id: params.id,
      },
      data: processedData,
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error updating company:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Company name already exists' }, { status: 409 })
    }
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if company exists and get related data count for logging
    const existingCompany = await prisma.company.findUnique({
      where: {
        id: params.id,
      },
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

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Log what will be deleted for transparency
    const totalRelatedRecords = 
      existingCompany._count.items +
      existingCompany._count.users +
      existingCompany._count.locations +
      existingCompany._count.expenses

    console.log(`Deleting company "${existingCompany.name}" and ${totalRelatedRecords} related records:`, {
      items: existingCompany._count.items,
      users: existingCompany._count.users,
      locations: existingCompany._count.locations,
      expenses: existingCompany._count.expenses,
    })

    // Delete the company (cascade delete will handle all related data)
    await prisma.company.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ 
      message: 'Company and all related data deleted successfully',
      deletedData: {
        company: existingCompany.name,
        items: existingCompany._count.items,
        users: existingCompany._count.users,
        locations: existingCompany._count.locations,
        expenses: existingCompany._count.expenses,
      }
    })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}