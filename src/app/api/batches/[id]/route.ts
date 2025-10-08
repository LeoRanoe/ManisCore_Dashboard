import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncItemQuantityFromBatches } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// GET /api/batches/[id] - Get single batch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await prisma.stockBatch.findUnique({
      where: { id: params.id },
      include: {
        item: {
          include: {
            company: true
          }
        },
        location: true,
        assignedUser: true
      }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch)
  } catch (error) {
    console.error('Error fetching batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/batches/[id] - Update batch
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const {
      quantity,
      status,
      costPerUnitUSD,
      freightCostUSD,
      locationId,
      assignedUserId,
      orderDate,
      expectedArrival,
      arrivedDate,
      orderNumber,
      notes
    } = body

    // Get existing batch
    const existingBatch = await prisma.stockBatch.findUnique({
      where: { id: params.id },
      include: {
        item: true
      }
    })

    if (!existingBatch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // If status changed to "Ordered", handle cash deduction
    if (status && status === 'Ordered' && existingBatch.status !== 'Ordered') {
      const company = await prisma.company.findUnique({
        where: { id: existingBatch.item.companyId }
      })

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      const totalCost = ((costPerUnitUSD || existingBatch.costPerUnitUSD) * (quantity || existingBatch.quantity)) +
                        (freightCostUSD !== undefined ? freightCostUSD : existingBatch.freightCostUSD)

      if (company.cashBalanceUSD < totalCost) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            required: totalCost,
            available: company.cashBalanceUSD
          },
          { status: 400 }
        )
      }

      await prisma.company.update({
        where: { id: company.id },
        data: { cashBalanceUSD: company.cashBalanceUSD - totalCost }
      })
    }

    // If status changed to "Arrived", set arrivedDate
    const shouldSetArrivedDate = status === 'Arrived' && existingBatch.status !== 'Arrived'

    // Build update data
    const updateData: any = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (status !== undefined) updateData.status = status
    if (costPerUnitUSD !== undefined) updateData.costPerUnitUSD = costPerUnitUSD
    if (freightCostUSD !== undefined) updateData.freightCostUSD = freightCostUSD
    if (locationId !== undefined) updateData.locationId = locationId
    if (assignedUserId !== undefined) updateData.assignedUserId = assignedUserId
    if (orderDate !== undefined) updateData.orderDate = orderDate ? new Date(orderDate) : null
    if (expectedArrival !== undefined) updateData.expectedArrival = expectedArrival ? new Date(expectedArrival) : null
    if (shouldSetArrivedDate) updateData.arrivedDate = new Date()
    else if (arrivedDate !== undefined) updateData.arrivedDate = arrivedDate ? new Date(arrivedDate) : null
    if (orderNumber !== undefined) updateData.orderNumber = orderNumber
    if (notes !== undefined) updateData.notes = notes

    // Update batch
    const updatedBatch = await prisma.stockBatch.update({
      where: { id: params.id },
      data: updateData,
      include: {
        item: {
          include: {
            company: true
          }
        },
        location: true,
        assignedUser: true
      }
    })

    // Sync item quantity from all batches
    await syncItemQuantityFromBatches(updatedBatch.itemId)

    return NextResponse.json(updatedBatch)
  } catch (error) {
    console.error('Error updating batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/batches/[id] - Delete batch
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get batch info before deletion
    const batch = await prisma.stockBatch.findUnique({
      where: { id: params.id },
      include: {
        item: true
      }
    })

    if (!batch) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    // If batch was "Ordered" or "Arrived", return cash to company
    if (batch.status === 'Ordered' || batch.status === 'Arrived') {
      const totalCost = (batch.costPerUnitUSD * batch.quantity) + batch.freightCostUSD
      
      await prisma.company.update({
        where: { id: batch.item.companyId },
        data: {
          cashBalanceUSD: { increment: totalCost }
        }
      })
    }

    // Delete batch
    await prisma.stockBatch.delete({
      where: { id: params.id }
    })

    // Sync item quantity from remaining batches
    await syncItemQuantityFromBatches(batch.itemId)

    return NextResponse.json({
      message: 'Batch deleted successfully',
      refundedAmount: (batch.costPerUnitUSD * batch.quantity) + batch.freightCostUSD
    })
  } catch (error) {
    console.error('Error deleting batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
