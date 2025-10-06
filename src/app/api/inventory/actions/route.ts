import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { z } from 'zod'

// Schema for sell action
const SellItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantityToSell: z.number().int().min(1, 'Quantity to sell must be at least 1'),
  sellingPriceSRD: z.number().min(0, 'Selling price must be non-negative').optional(),
})

// Schema for remove from stock action
const RemoveFromStockSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantityToRemove: z.number().int().min(1, 'Quantity to remove must be at least 1'),
  reason: z.string().optional(),
})

// Schema for add to stock action
const AddToStockSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantityToAdd: z.number().int().min(1, 'Quantity to add must be at least 1'),
  reason: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action } = body

    switch (action) {
      case 'sell': {
        const validation = SellItemSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid sell data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        const { itemId, quantityToSell, sellingPriceSRD } = validation.data

        // Get the item with company info
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: { company: true },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        if (item.quantityInStock < quantityToSell) {
          return NextResponse.json({ 
            error: 'Insufficient stock', 
            message: `Cannot sell ${quantityToSell} items. Only ${item.quantityInStock} in stock.`,
            available: item.quantityInStock,
            requested: quantityToSell,
          }, { status: 400 })
        }

        // Use provided selling price or default to item's selling price
        const finalSellingPriceSRD = sellingPriceSRD || item.sellingPriceSRD
        const totalRevenueSRD = finalSellingPriceSRD * quantityToSell

        // Calculate profit (revenue - cost)
        const costPerUnitSRD = item.costPerUnitUSD * 5.5 // Approximate USD to SRD conversion
        const totalCostSRD = costPerUnitSRD * quantityToSell
        const profitSRD = totalRevenueSRD - totalCostSRD

        // Use transaction to update inventory and finances
        const result = await prisma.$transaction(async (tx) => {
          // Update item quantity
          const updatedItem = await tx.item.update({
            where: { id: itemId },
            data: {
              quantityInStock: item.quantityInStock - quantityToSell,
              status: item.quantityInStock - quantityToSell === 0 ? 'Sold' : item.status,
            },
          })

          // Add revenue to company cash balance (SRD)
          const updatedCompany = await tx.company.update({
            where: { id: item.companyId },
            data: {
              cashBalanceSRD: item.company.cashBalanceSRD + totalRevenueSRD,
            },
          })

          // Create expense record for tracking the sale (negative expense = income)
          const saleRecord = await tx.expense.create({
            data: {
              description: `Sale of ${quantityToSell}x ${item.name}`,
              amount: -totalRevenueSRD, // Negative to indicate income
              currency: 'SRD',
              category: 'MISCELLANEOUS',
              notes: `Sold ${quantityToSell} units at ${finalSellingPriceSRD} SRD each. Profit: ${profitSRD.toFixed(2)} SRD`,
              companyId: item.companyId,
            },
          })

          return { updatedItem, updatedCompany, saleRecord }
        })

        return NextResponse.json({
          success: true,
          message: `Successfully sold ${quantityToSell}x ${item.name}`,
          sale: {
            itemId,
            itemName: item.name,
            quantitySold: quantityToSell,
            pricePerUnit: finalSellingPriceSRD,
            totalRevenue: totalRevenueSRD,
            profit: profitSRD,
            remainingStock: result.updatedItem.quantityInStock,
          },
          updatedItem: result.updatedItem,
          saleRecord: result.saleRecord,
        })
      }

      case 'add': {
        const validation = AddToStockSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid add data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        const { itemId, quantityToAdd, reason } = validation.data

        // Get the item with company info
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: { company: true },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Update item quantity
        const updatedItem = await prisma.item.update({
          where: { id: itemId },
          data: {
            quantityInStock: item.quantityInStock + quantityToAdd,
            status: item.status === 'Sold' && item.quantityInStock + quantityToAdd > 0 ? 'Arrived' : item.status,
          },
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

        return NextResponse.json({
          success: true,
          message: `Successfully added ${quantityToAdd}x ${item.name} to stock`,
          addition: {
            itemId,
            itemName: item.name,
            quantityAdded: quantityToAdd,
            reason: reason || 'Manual stock addition',
            newStock: updatedItem.quantityInStock,
          },
          updatedItem,
        })
      }

      case 'remove': {
        const validation = RemoveFromStockSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid remove data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        const { itemId, quantityToRemove, reason } = validation.data

        // Get the item with company info
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: { company: true },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        if (item.quantityInStock < quantityToRemove) {
          return NextResponse.json({ 
            error: 'Insufficient stock', 
            message: `Cannot remove ${quantityToRemove} items. Only ${item.quantityInStock} in stock.`,
            available: item.quantityInStock,
            requested: quantityToRemove,
          }, { status: 400 })
        }

        // Calculate the cost value of removed items (allocate to profit)
        const costPerUnitSRD = item.costPerUnitUSD * 5.5 // Approximate USD to SRD conversion
        const totalCostSRD = costPerUnitSRD * quantityToRemove

        // Use transaction to update inventory and allocate cost to profit
        const result = await prisma.$transaction(async (tx) => {
          // Update item quantity
          const updatedItem = await tx.item.update({
            where: { id: itemId },
            data: {
              quantityInStock: item.quantityInStock - quantityToRemove,
              status: item.quantityInStock - quantityToRemove === 0 ? 'Sold' : item.status,
            },
          })

          // Allocate cost to profit (add to cash balance as if it was profit)
          const updatedCompany = await tx.company.update({
            where: { id: item.companyId },
            data: {
              cashBalanceSRD: item.company.cashBalanceSRD + totalCostSRD,
            },
          })

          // Create expense record for tracking the removal (negative expense = allocated profit)
          const removalRecord = await tx.expense.create({
            data: {
              description: `Stock removal: ${quantityToRemove}x ${item.name}`,
              amount: -totalCostSRD, // Negative to indicate profit allocation
              currency: 'SRD',
              category: 'MISCELLANEOUS',
              notes: `Removed ${quantityToRemove} units from stock. ${reason ? `Reason: ${reason}` : 'No reason specified'}. Cost allocated to profit.`,
              companyId: item.companyId,
            },
          })

          return { updatedItem, updatedCompany, removalRecord }
        })

        return NextResponse.json({
          success: true,
          message: `Successfully removed ${quantityToRemove}x ${item.name} from stock`,
          removal: {
            itemId,
            itemName: item.name,
            quantityRemoved: quantityToRemove,
            costAllocatedToProfit: totalCostSRD,
            reason: reason || 'No reason specified',
            remainingStock: result.updatedItem.quantityInStock,
          },
          updatedItem: result.updatedItem,
          removalRecord: result.removalRecord,
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Must be "sell", "remove", or "add"' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in inventory action:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}