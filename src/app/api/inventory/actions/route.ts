import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncItemQuantityFromBatches } from '@/lib/utils'
import { z } from 'zod'

// ⚠️ LEGACY SYSTEM WARNING:
// This route is for NON-BATCH items only (useBatchSystem = false)
// For batch-system items (useBatchSystem = true), operations should be done through:
// - POST /api/batches (create/add stock)
// - PATCH /api/batches/[id] (update status, quantity)
// - DELETE /api/batches/[id] (remove stock)
// All new items default to useBatchSystem = true

// Schema for sell action
const SellItemSchema = z.object({
  itemId: z.string().min(1, 'Item ID is required'),
  quantityToSell: z.number().int().min(1, 'Quantity to sell must be at least 1'),
  sellingPriceSRD: z.number().min(0, 'Selling price must be non-negative').optional(),
  locationId: z.string().optional(), // Optional: track which location the sale is from
  assignedUserId: z.string().optional(), // Optional: track who made the sale
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

        const { itemId, quantityToSell, sellingPriceSRD, locationId, assignedUserId } = validation.data

        // Get the item with company info
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: { 
            company: true,
            batches: true 
          },
        })

        if (!item) {
          return NextResponse.json({ error: 'Item not found' }, { status: 404 })
        }

        // Check if item uses batch system
        if (item.useBatchSystem) {
          // For batch-system items, we need to reduce batch quantities
          const currentStock = item.quantityInStock || 0
          if (currentStock < quantityToSell) {
            return NextResponse.json({ 
              error: 'Insufficient stock', 
              message: `Cannot sell ${quantityToSell} items. Only ${currentStock} in stock.`,
              available: currentStock,
              requested: quantityToSell,
            }, { status: 400 })
          }

          // Get batches ordered by oldest first (FIFO)
          // If locationId is provided, prioritize batches from that location
          const batchWhere: any = {
            itemId,
            quantity: { gt: 0 }
          }
          
          const availableBatches = await prisma.stockBatch.findMany({
            where: batchWhere,
            orderBy: [
              // Prioritize batches from selected location if specified
              ...(locationId ? [{ locationId: locationId === 'none' ? null : locationId } as any] : []),
              { createdAt: 'asc' } // Then FIFO
            ]
          })

          let remainingToSell = quantityToSell
          const batchUpdates: Array<{ id: string; newQuantity: number }> = []

          // Reduce quantities from batches (FIFO)
          for (const batch of availableBatches) {
            if (remainingToSell <= 0) break

            const quantityFromThisBatch = Math.min(batch.quantity, remainingToSell)
            const newBatchQuantity = batch.quantity - quantityFromThisBatch
            
            batchUpdates.push({
              id: batch.id,
              newQuantity: newBatchQuantity
            })

            remainingToSell -= quantityFromThisBatch
          }

          // Use provided selling price or default to item's selling price
          const finalSellingPriceSRD = sellingPriceSRD || item.sellingPriceSRD
          const totalRevenueSRD = finalSellingPriceSRD * quantityToSell

          // Calculate profit (revenue - cost)
          const costPerUnitSRD = item.costPerUnitUSD * 5.5
          const totalCostSRD = costPerUnitSRD * quantityToSell
          const profitSRD = totalRevenueSRD - totalCostSRD

          // Update batches and create sale record in transaction
          const result = await prisma.$transaction(async (tx) => {
            // Update each batch
            for (const update of batchUpdates) {
              if (update.newQuantity === 0) {
                // Delete batch if quantity reaches 0
                await tx.stockBatch.delete({
                  where: { id: update.id }
                })
              } else {
                await tx.stockBatch.update({
                  where: { id: update.id },
                  data: { quantity: update.newQuantity }
                })
              }
            }

            // Add revenue to company cash balance (SRD)
            const updatedCompany = await tx.company.update({
              where: { id: item.companyId },
              data: {
                cashBalanceSRD: item.company.cashBalanceSRD + totalRevenueSRD,
              },
            })

            // Create expense record for tracking the sale
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

            return { updatedCompany, saleRecord }
          })

          // Sync item quantity from batches
          await syncItemQuantityFromBatches(itemId)

          // Get updated item
          const updatedItem = await prisma.item.findUnique({
            where: { id: itemId }
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
              remainingStock: updatedItem?.quantityInStock || 0,
            },
            updatedItem,
            saleRecord: result.saleRecord,
          })
        }

        // LEGACY: For non-batch items, use old system
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
        const costPerUnitSRD = item.costPerUnitUSD * 5.5 // Approximate USD to SRD conversion
        const totalCostSRD = costPerUnitSRD * quantityToSell
        const profitSRD = totalRevenueSRD - totalCostSRD

        // Use transaction to update inventory and finances
        const result = await prisma.$transaction(async (tx) => {
          // Update item quantity
          const newStock = currentStock - quantityToSell
          const updatedItem = await tx.item.update({
            where: { id: itemId },
            data: {
              quantityInStock: newStock,
              status: newStock === 0 ? 'Sold' : (item.status || 'ToOrder'),
            },
          })

          // Add revenue to company cash balance (SRD)
          const updatedCompany = await tx.company.update({
            where: { id: item.companyId },
            data: {
              cashBalanceSRD: item.company.cashBalanceSRD + totalRevenueSRD,
            },
          })

          // Create expense record for tracking the sale (positive amount = revenue/income)
          const saleRecord = await tx.expense.create({
            data: {
              description: `Sale of ${quantityToSell}x ${item.name}`,
              amount: totalRevenueSRD, // Positive to indicate revenue/income
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

        // Check if item uses batch system
        if (item.useBatchSystem) {
          // For batch-system items, create a new batch
          const newBatch = await prisma.stockBatch.create({
            data: {
              itemId,
              quantity: quantityToAdd,
              originalQuantity: quantityToAdd, // Set original quantity on creation
              status: 'Arrived',
              costPerUnitUSD: item.costPerUnitUSD,
              freightCostUSD: 0,
              notes: reason || 'Manual stock addition',
              locationId: item.locationId,
              assignedUserId: item.assignedUserId,
            }
          })

          // Sync item quantity from batches
          await syncItemQuantityFromBatches(itemId)

          // Get updated item
          const updatedItem = await prisma.item.findUnique({
            where: { id: itemId },
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
              newStock: updatedItem?.quantityInStock || 0,
            },
            updatedItem,
            newBatch,
          })
        }

        // LEGACY: For non-batch items, update directly
        const currentStock = item.quantityInStock || 0
        const newStock = currentStock + quantityToAdd
        const updatedItem = await prisma.item.update({
          where: { id: itemId },
          data: {
            quantityInStock: newStock,
            status: (item.status || 'ToOrder') === 'Sold' && newStock > 0 ? 'Arrived' : (item.status || 'ToOrder'),
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

        // Get the item with company info and batches
        const item = await prisma.item.findUnique({
          where: { id: itemId },
          include: { 
            company: true,
            batches: {
              where: {
                quantity: { gt: 0 }
              },
              orderBy: {
                createdAt: 'asc' // FIFO: oldest batches first
              }
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

        // Check if item uses batch system
        if (item.useBatchSystem) {
          // For batch-system items, reduce quantities from oldest batches first (FIFO)
          const availableBatches = item.batches

          if (availableBatches.length === 0) {
            return NextResponse.json({
              error: 'No available batches',
              message: 'Item has no available batches to remove from.',
            }, { status: 400 })
          }

          // Calculate total available in batches
          const totalInBatches = availableBatches.reduce((sum, b) => sum + b.quantity, 0)
          if (totalInBatches < quantityToRemove) {
            return NextResponse.json({
              error: 'Insufficient batch quantity',
              message: `Cannot remove ${quantityToRemove} items. Only ${totalInBatches} available in batches.`,
              available: totalInBatches,
              requested: quantityToRemove,
            }, { status: 400 })
          }

          // Calculate cost of items being removed for profit allocation
          const costPerUnitSRD = item.costPerUnitUSD * 5.5 // USD to SRD conversion
          const totalCostSRD = costPerUnitSRD * quantityToRemove

          // Use transaction to reduce batch quantities and allocate cost to profit
          const result = await prisma.$transaction(async (tx) => {
            let remainingToRemove = quantityToRemove
            const batchUpdates: Array<{ id: string; newQuantity: number }> = []
            const batchesToDelete: string[] = []

            // Reduce quantities from oldest batches first (FIFO)
            for (const batch of availableBatches) {
              if (remainingToRemove <= 0) break

              if (batch.quantity <= remainingToRemove) {
                // Remove entire batch
                remainingToRemove -= batch.quantity
                batchesToDelete.push(batch.id)
              } else {
                // Partially reduce this batch
                const newQuantity = batch.quantity - remainingToRemove
                batchUpdates.push({ id: batch.id, newQuantity })
                remainingToRemove = 0
              }
            }

            // Delete empty batches
            if (batchesToDelete.length > 0) {
              await tx.stockBatch.deleteMany({
                where: {
                  id: { in: batchesToDelete }
                }
              })
            }

            // Update remaining batches
            for (const update of batchUpdates) {
              await tx.stockBatch.update({
                where: { id: update.id },
                data: { quantity: update.newQuantity }
              })
            }

            // Allocate cost to profit (add to cash balance)
            const updatedCompany = await tx.company.update({
              where: { id: item.companyId },
              data: {
                cashBalanceSRD: item.company.cashBalanceSRD + totalCostSRD,
              },
            })

            // Create expense record for tracking (negative expense = allocated profit)
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

            return { updatedCompany, removalRecord }
          })

          // Sync item quantity from batches
          await syncItemQuantityFromBatches(itemId)

          // Get updated item
          const updatedItem = await prisma.item.findUnique({
            where: { id: itemId },
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
              remainingStock: updatedItem?.quantityInStock || 0,
            },
            updatedItem,
            removalRecord: result.removalRecord,
          })
        }

        // LEGACY: For non-batch items, update directly
        // Calculate the cost value of removed items (allocate to profit)
        const costPerUnitSRD = item.costPerUnitUSD * 5.5 // Approximate USD to SRD conversion
        const totalCostSRD = costPerUnitSRD * quantityToRemove

        // Use transaction to update inventory and allocate cost to profit
        const result = await prisma.$transaction(async (tx) => {
          // Update item quantity
          const newStock = currentStock - quantityToRemove
          const updatedItem = await tx.item.update({
            where: { id: itemId },
            data: {
              quantityInStock: newStock,
              status: newStock === 0 ? 'Sold' : (item.status || 'ToOrder'),
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