import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema } from '@/lib/validations'
import { z } from 'zod'

// Schema for bulk operations
const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
})

const BulkCreateSchema = z.object({
  items: z.array(ItemFormSchema).min(1, 'At least one item is required'),
})

const BulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: ItemFormSchema.partial(),
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

        const createdItems = await prisma.$transaction(
          validation.data.items.map((item) =>
            prisma.item.create({ data: item })
          )
        )

        return NextResponse.json({ 
          success: true, 
          created: createdItems.length,
          items: createdItems 
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

        const updatedItems = await prisma.$transaction(
          validation.data.updates.map((update) =>
            prisma.item.update({
              where: { id: update.id },
              data: update.data,
            })
          )
        )

        return NextResponse.json({ 
          success: true, 
          updated: updatedItems.length,
          items: updatedItems 
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

        // Get items to delete for logging
        const itemsToDelete = await prisma.item.findMany({
          where: { id: { in: validation.data.ids } },
          select: { id: true, name: true, quantityInStock: true },
        })

        if (itemsToDelete.length === 0) {
          return NextResponse.json({ error: 'No items found to delete' }, { status: 404 })
        }

        // Delete items
        const deletedResult = await prisma.item.deleteMany({
          where: { id: { in: validation.data.ids } },
        })

        console.log(`Bulk deleted ${deletedResult.count} items`)

        return NextResponse.json({ 
          success: true, 
          deleted: deletedResult.count,
          items: itemsToDelete
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Must be one of: create, update, delete' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in bulk items operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}