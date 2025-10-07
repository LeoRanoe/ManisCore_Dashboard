import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

// GET /api/batches/[id] - Get single batch
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const batch = await prisma.$queryRaw<any[]>`
      SELECT 
        sb.*,
        i.name as item_name,
        i."sellingPriceSRD" as item_selling_price,
        l.name as location_name,
        u.name as assigned_user_name,
        c.name as company_name
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      LEFT JOIN locations l ON l.id = sb."locationId"
      LEFT JOIN users u ON u.id = sb."assignedUserId"
      JOIN companies c ON c.id = i."companyId"
      WHERE sb.id = ${params.id}
    `

    if (!batch || batch.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    return NextResponse.json(batch[0])
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
    const existingBatch = await prisma.$queryRaw<any[]>`
      SELECT sb.*, i."companyId" 
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      WHERE sb.id = ${params.id}
    `

    if (!existingBatch || existingBatch.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const batch = existingBatch[0]

    // If status changed to "Ordered", handle cash deduction
    if (status && status === 'Ordered' && batch.status !== 'Ordered') {
      const company = await prisma.company.findUnique({
        where: { id: batch.companyId }
      })

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      const totalCost = ((costPerUnitUSD || batch.costPerUnitUSD) * (quantity || batch.quantity)) +
                        (freightCostUSD !== undefined ? freightCostUSD : batch.freightCostUSD)

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
    const shouldSetArrivedDate = status === 'Arrived' && batch.status !== 'Arrived'

    // Build update query
    await prisma.$executeRaw`
      UPDATE stock_batches
      SET
        quantity = COALESCE(${quantity}, quantity),
        status = COALESCE(${status}::"Status", status),
        "costPerUnitUSD" = COALESCE(${costPerUnitUSD}, "costPerUnitUSD"),
        "freightCostUSD" = COALESCE(${freightCostUSD}, "freightCostUSD"),
        "locationId" = COALESCE(${locationId}, "locationId"),
        "assignedUserId" = COALESCE(${assignedUserId}, "assignedUserId"),
        "orderDate" = COALESCE(${orderDate ? new Date(orderDate) : null}, "orderDate"),
        "expectedArrival" = COALESCE(${expectedArrival ? new Date(expectedArrival) : null}, "expectedArrival"),
        "arrivedDate" = COALESCE(${shouldSetArrivedDate ? new Date() : arrivedDate ? new Date(arrivedDate) : null}, "arrivedDate"),
        "orderNumber" = COALESCE(${orderNumber}, "orderNumber"),
        notes = COALESCE(${notes}, notes),
        "updatedAt" = ${new Date()}
      WHERE id = ${params.id}
    `

    // Fetch updated batch
    const updatedBatch = await prisma.$queryRaw<any[]>`
      SELECT 
        sb.*,
        i.name as item_name,
        l.name as location_name,
        u.name as assigned_user_name
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      LEFT JOIN locations l ON l.id = sb."locationId"
      LEFT JOIN users u ON u.id = sb."assignedUserId"
      WHERE sb.id = ${params.id}
    `

    return NextResponse.json(updatedBatch[0])
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
    const batch = await prisma.$queryRaw<any[]>`
      SELECT sb.*, i."companyId", i.name as item_name
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      WHERE sb.id = ${params.id}
    `

    if (!batch || batch.length === 0) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const batchData = batch[0]

    // If batch was "Ordered" or "Arrived", return cash to company
    if (batchData.status === 'Ordered' || batchData.status === 'Arrived') {
      const totalCost = (batchData.costPerUnitUSD * batchData.quantity) + batchData.freightCostUSD
      
      await prisma.company.update({
        where: { id: batchData.companyId },
        data: {
          cashBalanceUSD: { increment: totalCost }
        }
      })
    }

    // Delete batch
    await prisma.$executeRaw`
      DELETE FROM stock_batches WHERE id = ${params.id}
    `

    return NextResponse.json({
      message: 'Batch deleted successfully',
      refundedAmount: (batchData.costPerUnitUSD * batchData.quantity) + batchData.freightCostUSD
    })
  } catch (error) {
    console.error('Error deleting batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
