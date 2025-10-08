import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema } from '@/lib/validations'
import { syncItemQuantityFromBatches } from '@/lib/utils'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    console.log('Received item update request:', JSON.stringify(body, null, 2))
    
    const validation = ItemFormSchema.safeParse(body)

    if (!validation.success) {
      console.error('Validation failed:', validation.error.issues)
      return NextResponse.json({ error: 'Invalid item data', details: validation.error.issues }, { status: 400 })
    }

    const data = validation.data

    // Clean up the data - remove null/undefined optional fields
    const cleanedData: any = {
      name: data.name,
      status: data.status,
      quantityInStock: data.quantityInStock,
      costPerUnitUSD: data.costPerUnitUSD,
      freightCostUSD: data.freightCostUSD,
      sellingPriceSRD: data.sellingPriceSRD,
      companyId: data.companyId,
    }

    // Only add optional fields if they have values
    if (data.supplier) cleanedData.supplier = data.supplier
    if (data.supplierSku) cleanedData.supplierSku = data.supplierSku
    if (data.orderDate) cleanedData.orderDate = new Date(data.orderDate)
    if (data.expectedArrival) cleanedData.expectedArrival = new Date(data.expectedArrival)
    if (data.orderNumber) cleanedData.orderNumber = data.orderNumber
    if (data.profitMarginPercent !== null && data.profitMarginPercent !== undefined) cleanedData.profitMarginPercent = data.profitMarginPercent
    if (data.minStockLevel !== null && data.minStockLevel !== undefined) cleanedData.minStockLevel = data.minStockLevel
    if (data.notes) cleanedData.notes = data.notes
    if (data.assignedUserId) cleanedData.assignedUserId = data.assignedUserId
    if (data.locationId) cleanedData.locationId = data.locationId

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            cashBalanceUSD: true,
          },
        },
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if status is changing TO "ToOrder" - this triggers cash deduction
    // When you mark an item "To Order", you're committing to spend that money
    if (existingItem.status !== 'ToOrder' && data.status === 'ToOrder') {
      if (!existingItem.company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      // Calculate total order cost (cost per unit + freight, multiplied by quantity)
      const quantityOrdered = data.quantityInStock || 0
      const freightCost = data.freightCostUSD || 0
      const totalOrderCostUSD = (data.costPerUnitUSD * quantityOrdered) + freightCost

      // Check if company has sufficient USD balance
      if (existingItem.company.cashBalanceUSD < totalOrderCostUSD) {
        return NextResponse.json(
          { 
            error: 'Insufficient funds',
            message: `Company ${existingItem.company.name} has insufficient USD balance. Required: $${totalOrderCostUSD.toFixed(2)}, Available: $${existingItem.company.cashBalanceUSD.toFixed(2)}`,
            required: totalOrderCostUSD,
            available: existingItem.company.cashBalanceUSD,
          },
          { status: 400 }
        )
      }

      // Deduct the cost from company's USD balance
      await prisma.company.update({
        where: { id: existingItem.companyId },
        data: {
          cashBalanceUSD: existingItem.company.cashBalanceUSD - totalOrderCostUSD,
        },
      })
    }

    // Check if status is changing FROM "ToOrder" to something else - this refunds the cash
    // If you cancel or change status away from "ToOrder", refund the reserved money
    if (existingItem.status === 'ToOrder' && data.status !== 'ToOrder') {
      if (!existingItem.company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      // Calculate the refund amount using existing item costs
      const existingQty = existingItem.quantityInStock || 0
      const existingFreight = existingItem.freightCostUSD || 0
      const refundAmountUSD = (existingItem.costPerUnitUSD * existingQty) + existingFreight

      // Refund the cost to company's USD balance
      await prisma.company.update({
        where: { id: existingItem.companyId },
        data: {
          cashBalanceUSD: existingItem.company.cashBalanceUSD + refundAmountUSD,
        },
      })
    }

    console.log('Updating item with data:', JSON.stringify(cleanedData, null, 2))

    const updatedItem = await prisma.item.update({
      where: { id },
      data: cleanedData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Sync item quantity from batches if using batch system
    if (updatedItem.useBatchSystem) {
      try {
        await syncItemQuantityFromBatches(updatedItem.id)
      } catch (syncError) {
        console.warn('⚠️ Failed to sync item quantity from batches:', syncError)
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await prisma.item.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}