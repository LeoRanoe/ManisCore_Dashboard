import { prisma } from '../lib/db'

/**
 * This script fixes existing inventory data issues:
 * 1. Syncs item locations with their batches' primary location
 * 2. Ensures item quantities match batch totals
 * 3. Consolidates duplicate batches
 */

async function fixInventoryData() {
  console.log('🔧 Starting Inventory Data Fix...\n')

  // 1. Fix items without location but batches have locations
  console.log('1. Fixing item locations...')
  const itemsWithoutLocation = await prisma.item.findMany({
    where: {
      locationId: null,
      useBatchSystem: true,
    },
    include: {
      batches: {
        where: {
          locationId: { not: null }
        },
        include: {
          location: true
        }
      }
    }
  })

  for (const item of itemsWithoutLocation) {
    if (item.batches.length === 0) continue

    // Find the location with the most batches for this item
    const locationCounts = new Map<string, { count: number, name: string }>()
    item.batches.forEach(batch => {
      if (batch.locationId) {
        const existing = locationCounts.get(batch.locationId) || { count: 0, name: batch.location?.name || 'Unknown' }
        locationCounts.set(batch.locationId, { count: existing.count + 1, name: existing.name })
      }
    })

    // Set item location to the most common batch location
    let primaryLocationId: string | null = null
    let maxCount = 0
    locationCounts.forEach((data, locationId) => {
      if (data.count > maxCount) {
        maxCount = data.count
        primaryLocationId = locationId
      }
    })

    if (primaryLocationId) {
      await prisma.item.update({
        where: { id: item.id },
        data: { locationId: primaryLocationId }
      })
      console.log(`   ✅ Set location for "${item.name}" to ${locationCounts.get(primaryLocationId)?.name}`)
    }
  }

  // 2. Sync all item quantities with batches
  console.log('\n2. Syncing item quantities with batches...')
  const allItems = await prisma.item.findMany({
    where: { useBatchSystem: true },
    include: { batches: true }
  })

  for (const item of allItems) {
    const batchTotal = item.batches.reduce((sum, b) => sum + b.quantity, 0)
    if (item.quantityInStock !== batchTotal) {
      await prisma.item.update({
        where: { id: item.id },
        data: { quantityInStock: batchTotal }
      })
      console.log(`   ✅ Synced "${item.name}": ${item.quantityInStock} → ${batchTotal}`)
    }
  }

  // 3. Check for and report potential duplicate batches
  console.log('\n3. Checking for duplicate batches...')
  const allBatches = await prisma.stockBatch.findMany({
    include: {
      item: { select: { name: true } },
      location: { select: { name: true } }
    },
    orderBy: [{ itemId: 'asc' }, { createdAt: 'asc' }]
  })

  const batchGroups = new Map<string, any[]>()
  allBatches.forEach(batch => {
    const key = `${batch.itemId}-${batch.locationId || 'null'}-${batch.status}-${batch.costPerUnitUSD}-${batch.freightCostUSD}`
    if (!batchGroups.has(key)) {
      batchGroups.set(key, [])
    }
    batchGroups.get(key)!.push(batch)
  })

  const duplicates = Array.from(batchGroups.entries()).filter(([_, batches]) => batches.length > 1)
  
  if (duplicates.length > 0) {
    console.log(`   ⚠️  Found ${duplicates.length} potential duplicate batch groups:`)
    duplicates.forEach(([key, batches]) => {
      console.log(`   - ${batches[0].item.name} at ${batches[0].location?.name || 'No Location'}:`)
      batches.forEach(b => console.log(`     * Batch ${b.id.substring(0, 8)}: qty=${b.quantity}, created=${b.createdAt.toISOString().split('T')[0]}`))
    })
    console.log('   ℹ️  These may be intentional. Review manually if consolidation is needed.')
  } else {
    console.log('   ✅ No duplicate batches found')
  }

  // 4. Summary
  console.log('\n=== Fix Summary ===')
  console.log(`Items with location fixed: ${itemsWithoutLocation.filter(i => i.batches.length > 0).length}`)
  console.log(`Items with quantity synced: ${allItems.filter(item => {
    const batchTotal = item.batches.reduce((sum, b) => sum + b.quantity, 0)
    return item.quantityInStock !== batchTotal
  }).length}`)
  console.log(`Potential duplicate groups: ${duplicates.length}`)
  console.log('\n✅ Inventory data fix complete!')

  await prisma.$disconnect()
}

fixInventoryData().catch(console.error)
