import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { LocationFormSchema } from '@/lib/validations'
import { z } from 'zod'

// Schema for bulk operations
const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
})

const BulkCreateSchema = z.object({
  locations: z.array(LocationFormSchema).min(1, 'At least one location is required'),
})

const BulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: LocationFormSchema.partial(),
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

        const createdLocations = await prisma.$transaction(
          validation.data.locations.map((location) =>
            prisma.location.create({ data: location })
          )
        )

        return NextResponse.json({ 
          success: true, 
          created: createdLocations.length,
          locations: createdLocations 
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

        const updatedLocations = await prisma.$transaction(
          validation.data.updates.map((update) =>
            prisma.location.update({
              where: { id: update.id },
              data: update.data,
            })
          )
        )

        return NextResponse.json({ 
          success: true, 
          updated: updatedLocations.length,
          locations: updatedLocations 
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

        // Get locations to delete for logging
        const locationsToDelete = await prisma.location.findMany({
          where: { id: { in: validation.data.ids } },
          select: { id: true, name: true, address: true },
        })

        if (locationsToDelete.length === 0) {
          return NextResponse.json({ error: 'No locations found to delete' }, { status: 404 })
        }

        // Delete locations
        const deletedResult = await prisma.location.deleteMany({
          where: { id: { in: validation.data.ids } },
        })

        console.log(`Bulk deleted ${deletedResult.count} locations`)

        return NextResponse.json({ 
          success: true, 
          deleted: deletedResult.count,
          locations: locationsToDelete
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Must be one of: create, update, delete' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in bulk locations operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}