import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { prisma } from "./db"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats currency with proper sign handling
 * - Shows no sign for zero values
 * - Shows + for positive values
 * - Shows - for negative values
 * @param amount The amount to format
 * @param currency The currency code (SRD or USD)
 * @returns Formatted string with proper sign
 */
export function formatCurrencyWithSign(amount: number, currency: 'SRD' | 'USD' = 'SRD'): string {
  const absAmount = Math.abs(amount)
  const formatted = currency === 'USD' 
    ? `$${absAmount.toFixed(2)}`
    : `SRD ${absAmount.toFixed(2)}`
  
  if (amount === 0) {
    return formatted // No sign for zero
  } else if (amount > 0) {
    return `+${formatted}` // Plus sign for positive
  } else {
    return `-${formatted}` // Minus sign for negative
  }
}

/**
 * Synchronizes item.quantityInStock with the sum of all batch quantities
 * This ensures items and batches are always consistent
 * @param itemId The ID of the item to synchronize
 * @returns The updated item with synchronized quantity
 */
export async function syncItemQuantityFromBatches(itemId: string) {
  try {
    // Get the item to check if it uses batch system
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      select: { id: true, useBatchSystem: true }
    })

    if (!item) {
      throw new Error(`Item ${itemId} not found`)
    }

    // Only sync if item uses batch system
    if (!item.useBatchSystem) {
      console.log(`Item ${itemId} does not use batch system, skipping sync`)
      return item
    }

    // Calculate total quantity from all batches
    const batchAggregation = await prisma.stockBatch.aggregate({
      where: { itemId },
      _sum: {
        quantity: true
      }
    })

    const totalQuantity = batchAggregation._sum.quantity || 0

    // Update item quantity to match batch total
    const updatedItem = await prisma.item.update({
      where: { id: itemId },
      data: { 
        quantityInStock: totalQuantity,
        // Update status based on quantity
        status: totalQuantity === 0 ? 'Sold' : undefined
      }
    })

    console.log(`✅ Synced item ${itemId}: quantityInStock = ${totalQuantity}`)
    return updatedItem
  } catch (error) {
    console.error(`❌ Error syncing item ${itemId}:`, error)
    throw error
  }
}

/**
 * Validates that item.quantityInStock matches sum of batch quantities
 * @param itemId The ID of the item to validate
 * @returns Object with validation result and details
 */
export async function validateItemBatchConsistency(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      batches: {
        select: { id: true, quantity: true }
      }
    }
  })

  if (!item) {
    return { valid: false, error: 'Item not found' }
  }

  if (!item.useBatchSystem) {
    return { valid: true, message: 'Item does not use batch system' }
  }

  const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
  const itemQuantity = item.quantityInStock || 0

  const isConsistent = batchTotal === itemQuantity

  return {
    valid: isConsistent,
    itemId: item.id,
    itemName: item.name,
    itemQuantity,
    batchTotal,
    difference: batchTotal - itemQuantity,
    batchCount: item.batches.length,
    message: isConsistent 
      ? '✅ Item and batches are consistent' 
      : `❌ Inconsistency detected: Item shows ${itemQuantity}, batches total ${batchTotal}`
  }
}

/**
 * Syncs all items that use the batch system
 * Useful for batch operations or data fixes
 */
export async function syncAllBatchSystemItems() {
  const batchSystemItems = await prisma.item.findMany({
    where: { useBatchSystem: true },
    select: { id: true, name: true }
  })

  console.log(`🔄 Syncing ${batchSystemItems.length} batch-system items...`)
  
  const results = []
  for (const item of batchSystemItems) {
    try {
      const updated = await syncItemQuantityFromBatches(item.id)
      results.push({ success: true, itemId: item.id, name: item.name })
    } catch (error) {
      results.push({ success: false, itemId: item.id, name: item.name, error })
    }
  }

  const successful = results.filter(r => r.success).length
  console.log(`✅ Successfully synced ${successful}/${batchSystemItems.length} items`)
  
  return results
}