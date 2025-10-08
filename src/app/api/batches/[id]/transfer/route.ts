import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncItemQuantityFromBatches } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// POST /api/batches/[id]/transfer - Transfer batch to different location
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { toLocationId, quantity } = body

    if (!toLocationId) {
      return NextResponse.json(
        { error: 'Missing required field: toLocationId' },
        { status: 400 }
      )
    }

    // Get existing batch
    const existingBatch = await prisma.$queryRaw<any[]>`
      SELECT sb.*, i.name as item_name
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      WHERE sb.id = ${params.id}
    `

    if (!existingBatch || existingBatch.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const batch = existingBatch[0]

    // Validate quantity
    const transferQuantity = quantity || batch.quantity
    if (transferQuantity > batch.quantity) {
      return NextResponse.json(
        { error: `Cannot transfer ${transferQuantity} units. Only ${batch.quantity} available.` },
        { status: 400 }
      )
    }

    // If transferring partial quantity, split the batch
    if (transferQuantity < batch.quantity) {
      // Reduce original batch quantity
      await prisma.$executeRaw`
        UPDATE stock_batches
        SET quantity = ${batch.quantity - transferQuantity},
            "updatedAt" = ${new Date()}
        WHERE id = ${params.id}
      `

      // Create new batch at target location
      const newBatch = await prisma.$queryRaw<{id: string}[]>`
        INSERT INTO stock_batches (
          id, quantity, status, "costPerUnitUSD", "freightCostUSD",
          "orderDate", "expectedArrival", "arrivedDate", "orderNumber", notes,
          "createdAt", "updatedAt", "itemId", "locationId", "assignedUserId"
        )
        VALUES (
          gen_random_uuid(),
          ${transferQuantity},
          ${batch.status}::"Status",
          ${batch.costPerUnitUSD},
          ${batch.freightCostUSD},
          ${batch.orderDate},
          ${batch.expectedArrival},
          ${batch.arrivedDate},
          ${batch.orderNumber},
          ${batch.notes},
          ${new Date()},
          ${new Date()},
          ${batch.itemId},
          ${toLocationId},
          ${batch.assignedUserId}
        )
        RETURNING id
      `

      return NextResponse.json({
        message: `Transferred ${transferQuantity} units to new location`,
        originalBatchId: params.id,
        newBatchId: newBatch[0]?.id,
        remainingInOriginal: batch.quantity - transferQuantity,
        transferredAmount: transferQuantity
      })
    } else {
      // Transfer entire batch - just update location
      await prisma.$executeRaw`
        UPDATE stock_batches
        SET "locationId" = ${toLocationId},
            "updatedAt" = ${new Date()}
        WHERE id = ${params.id}
      `

      return NextResponse.json({
        message: `Transferred all ${transferQuantity} units to new location`,
        batchId: params.id,
        transferredAmount: transferQuantity
      })
    }
    
    // Note: Quantity doesn't change during transfer, only location changes
    // So no need to sync item quantity here
  } catch (error) {
    console.error('Error transferring batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
