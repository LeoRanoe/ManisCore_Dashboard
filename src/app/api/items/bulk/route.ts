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

        // Process items to handle specifications field (convert string to object if needed)
        const processedItems = validation.data.items.map((item: any) => {
          const processed = { ...item }
          // Handle specifications: convert null to undefined
          if (processed.specifications === null) {
            processed.specifications = undefined
          } else if (typeof processed.specifications === 'string' && processed.specifications.trim()) {
            try {
              processed.specifications = JSON.parse(processed.specifications)
            } catch (e) {
              // If parsing fails, set to undefined
              processed.specifications = undefined
            }
          }
          return processed
        })

        const createdItems = await prisma.$transaction(
          processedItems.map((item) =>
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

        // Process updates to handle specifications field
        const processedUpdates = validation.data.updates.map((update: any) => {
          const processedData = { ...update.data }
          // Handle specifications
          if (processedData.specifications === null) {
            processedData.specifications = undefined
          } else if (typeof processedData.specifications === 'string' && processedData.specifications.trim()) {
            try {
              processedData.specifications = JSON.parse(processedData.specifications)
            } catch (e) {
              processedData.specifications = undefined
            }
          }
          return { id: update.id, data: processedData }
        })

        const updatedItems = await prisma.$transaction(
          processedUpdates.map((update) =>
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

        // Log items being deleted (handle nullable quantities)
        itemsToDelete.forEach(item => {
          console.log(`Deleting: ${item.name} (Qty: ${item.quantityInStock || 0})`)
        })

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