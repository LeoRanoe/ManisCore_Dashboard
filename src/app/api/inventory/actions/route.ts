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
    console.log('Inventory action request body:', body)
    const { action } = body

    if (!action) {
      return NextResponse.json({ 
        error: 'Action is required',
        message: 'Please specify the action to perform (sell, remove, add)'
      }, { status: 400 })
    }

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
          include: { 
            company: true,
            batches: {
              where: {
                status: { in: ['ToOrder', 'Ordered', 'Arrived'] }
              },
              orderBy: { createdAt: 'asc' } // FIFO: Sell from oldest batches first
            }
          },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        const currentStock = item.quantityInStock || 0
        if (currentStock < quantityToSell) {
          return NextResponse.json({ 
            error: 'Insufficient stock', 
            message: `Cannot sell ${quantityToSell} items. Only ${currentStock} in stock.`,
            available: currentStock,
            requested: quantityToSell,
          }, { status: 400 })
        }

        // Use provided selling price or default to item's selling price
        const finalSellingPriceSRD = sellingPriceSRD || item.sellingPriceSRD
        const totalRevenueSRD = finalSellingPriceSRD * quantityToSell

        // Calculate profit (revenue - cost)
        const costPerUnitSRD = item.costPerUnitUSD * 40 // Use standard 40 SRD = 1 USD
        const totalCostSRD = costPerUnitSRD * quantityToSell
        const profitSRD = totalRevenueSRD - totalCostSRD

        if (item.useBatchSystem) {
          // Sell from batches using FIFO (First In, First Out)
          let remaining = quantityToSell
          const soldBatches: string[] = []

          const result = await prisma.$transaction(async (tx) => {
            for (const batch of item.batches) {
              if (remaining <= 0) break

              if (batch.quantity <= remaining) {
                // Mark entire batch as sold
                await tx.stockBatch.update({
                  where: { id: batch.id },
                  data: { 
                    status: 'Sold',
                    notes: batch.notes ? `${batch.notes} | Sold on ${new Date().toISOString()}` : `Sold on ${new Date().toISOString()}`
                  }
                })
                remaining -= batch.quantity
                soldBatches.push(batch.id)
              } else {
                // Split batch: reduce quantity and create new "Sold" batch
                await tx.stockBatch.update({
                  where: { id: batch.id },
                  data: { quantity: batch.quantity - remaining }
                })
                
                // Create new batch for sold portion
                await tx.stockBatch.create({
                  data: {
                    itemId,
                    quantity: remaining,
                    status: 'Sold',
                    costPerUnitUSD: batch.costPerUnitUSD,
                    freightCostUSD: 0,
                    locationId: batch.locationId,
                    notes: `Split from batch ${batch.id}. Sold on ${new Date().toISOString()}`,
                  }
                })
                
                remaining = 0
                soldBatches.push(batch.id)
              }
            }

            // Calculate new total (only count non-Sold batches)
            const remainingBatches = await tx.stockBatch.findMany({
              where: {
                itemId,
                status: { not: 'Sold' }
              }
            })
            const newTotal = remainingBatches.reduce((sum, b) => sum + b.quantity, 0)

            // Update item quantity
            const updatedItem = await tx.item.update({
              where: { id: itemId },
              data: {
                quantityInStock: newTotal,
                status: newTotal === 0 ? 'Sold' : (item.status || 'ToOrder'),
              },
            })

            // Add revenue to company cash balance
            const updatedCompany = await tx.company.update({
              where: { id: item.companyId },
              data: {
                cashBalanceSRD: item.company.cashBalanceSRD + totalRevenueSRD,
              },
            })

            // Create expense record for the sale (positive = revenue/income)
            const saleRecord = await tx.expense.create({
              data: {
                description: `Sale of ${quantityToSell}x ${item.name}`,
                amount: totalRevenueSRD,
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
              batchesAffected: soldBatches.length,
            },
            updatedItem: result.updatedItem,
            saleRecord: result.saleRecord,
          })
        } else {
          // Old system: Direct item update
          const result = await prisma.$transaction(async (tx) => {
            const newStock = currentStock - quantityToSell
            const updatedItem = await tx.item.update({
              where: { id: itemId },
              data: {
                quantityInStock: newStock,
                status: newStock === 0 ? 'Sold' : (item.status || 'ToOrder'),
              },
            })

            const updatedCompany = await tx.company.update({
              where: { id: item.companyId },
              data: {
                cashBalanceSRD: item.company.cashBalanceSRD + totalRevenueSRD,
              },
            })

            const saleRecord = await tx.expense.create({
              data: {
                description: `Sale of ${quantityToSell}x ${item.name}`,
                amount: totalRevenueSRD,
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
          include: { 
            company: true,
            batches: true,
          },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // If item uses batch system, create a new batch. Otherwise update item directly
        if (item.useBatchSystem) {
          // Create a new batch for the added stock
          const newBatch = await prisma.stockBatch.create({
            data: {
              itemId,
              quantity: quantityToAdd,
              status: 'Arrived',
              costPerUnitUSD: item.costPerUnitUSD,
              freightCostUSD: 0,
              notes: reason || 'Manual stock addition',
              arrivedDate: new Date(),
            },
          })

          // Calculate new total from all batches
          const totalQuantity = item.batches.reduce((sum, b) => sum + b.quantity, 0) + quantityToAdd

          // Update item's quantityInStock to match batch total
          const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: {
              quantityInStock: totalQuantity,
            },
            include: {
              company: { select: { id: true, name: true } },
              assignedUser: { select: { id: true, name: true, email: true } },
              location: { select: { id: true, name: true } },
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
              batchId: newBatch.id,
            },
            updatedItem,
          })
        } else {
          // Old system: Update item quantity directly
          const currentStock = item.quantityInStock || 0
          const newStock = currentStock + quantityToAdd
          const updatedItem = await prisma.item.update({
            where: { id: itemId },
            data: {
              quantityInStock: newStock,
              status: (item.status || 'ToOrder') === 'Sold' && newStock > 0 ? 'Arrived' : (item.status || 'ToOrder'),
            },
            include: {
              company: { select: { id: true, name: true } },
              assignedUser: { select: { id: true, name: true, email: true } },
              location: { select: { id: true, name: true } },
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
          include: { 
            company: true,
            batches: {
              where: {
                status: { in: ['ToOrder', 'Ordered', 'Arrived'] }
              },
              orderBy: { createdAt: 'asc' } // FIFO: Remove from oldest batches first
            }
          },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        const currentStock = item.quantityInStock || 0
        if (currentStock < quantityToRemove) {
          return NextResponse.json({ 
            error: 'Insufficient stock', 
            message: `Cannot remove ${quantityToRemove} items. Only ${currentStock} in stock.`,
            available: currentStock,
            requested: quantityToRemove,
          }, { status: 400 })
        }

        // Calculate the cost value of removed items
        const costPerUnitSRD = item.costPerUnitUSD * 40 // Use standard 40 SRD = 1 USD
        const totalCostSRD = costPerUnitSRD * quantityToRemove

        if (item.useBatchSystem) {
          // Remove from batches using FIFO (First In, First Out)
          let remaining = quantityToRemove
          const updatedBatches: string[] = []

          const result = await prisma.$transaction(async (tx) => {
            for (const batch of item.batches) {
              if (remaining <= 0) break

              if (batch.quantity <= remaining) {
                // Remove entire batch
                await tx.stockBatch.delete({
                  where: { id: batch.id }
                })
                remaining -= batch.quantity
                updatedBatches.push(batch.id)
              } else {
                // Partially reduce batch
                await tx.stockBatch.update({
                  where: { id: batch.id },
                  data: { quantity: batch.quantity - remaining }
                })
                remaining = 0
                updatedBatches.push(batch.id)
              }
            }

            // Calculate new total
            const newTotal = currentStock - quantityToRemove

            // Update item's quantityInStock
            const updatedItem = await tx.item.update({
              where: { id: itemId },
              data: {
                quantityInStock: newTotal,
              },
            })

            // Allocate cost to profit
            const updatedCompany = await tx.company.update({
              where: { id: item.companyId },
              data: {
                cashBalanceSRD: item.company.cashBalanceSRD + totalCostSRD,
              },
            })

            // Create expense record
            const removalRecord = await tx.expense.create({
              data: {
                description: `Stock removal: ${quantityToRemove}x ${item.name}`,
                amount: -totalCostSRD,
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
              batchesAffected: updatedBatches.length,
            },
            updatedItem: result.updatedItem,
            removalRecord: result.removalRecord,
          })
        } else {
          // Old system: Direct item update
          const result = await prisma.$transaction(async (tx) => {
            const newStock = currentStock - quantityToRemove
            const updatedItem = await tx.item.update({
              where: { id: itemId },
              data: {
                quantityInStock: newStock,
                status: newStock === 0 ? 'Sold' : (item.status || 'ToOrder'),
              },
            })

            const updatedCompany = await tx.company.update({
              where: { id: item.companyId },
              data: {
                cashBalanceSRD: item.company.cashBalanceSRD + totalCostSRD,
              },
            })

            const removalRecord = await tx.expense.create({
              data: {
                description: `Stock removal: ${quantityToRemove}x ${item.name}`,
                amount: -totalCostSRD,
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