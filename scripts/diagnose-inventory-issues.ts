import { prisma } from '../lib/db'

async function diagnoseIssues() {
  console.log('=== Inventory Diagnostic Report ===\n')

  // 1. Check for duplicate batches
  console.log('1. Checking for duplicate batches...')
  const batches = await prisma.stockBatch.findMany({
    include: {
      item: { select: { id: true, name: true } },
      location: { select: { id: true, name: true } }
    },
    orderBy: { itemId: 'asc' }
  })

  const batchGroups = new Map<string, any[]>()
  batches.forEach(batch => {
    const key = `${batch.itemId}-${batch.locationId}-${batch.status}-${batch.costPerUnitUSD}`
    if (!batchGroups.has(key)) {
      batchGroups.set(key, [])
    }
    batchGroups.get(key)!.push(batch)
  })

  const duplicates = Array.from(batchGroups.entries()).filter(([_, batches]) => batches.length > 1)
  console.log(`   Found ${duplicates.length} duplicate batch groups:`)
  duplicates.forEach(([key, batches]) => {
    console.log(`   - ${batches[0].item.name} at ${batches[0].location?.name || 'No Location'}: ${batches.length} batches`)
    batches.forEach(b => console.log(`     * Batch ${b.id.substring(0, 8)}: qty=${b.quantity}`))
  })

  // 2. Check item-batch quantity sync
  console.log('\n2. Checking item-batch quantity synchronization...')
  const items = await prisma.item.findMany({
    include: {
      batches: true,
      location: true
    }
  })

  const syncIssues = items
    .filter(item => item.useBatchSystem)
    .map(item => {
      const batchTotal = item.batches.reduce((sum, b) => sum + b.quantity, 0)
      const itemQty = item.quantityInStock || 0
      return {
        id: item.id,
        name: item.name,
        itemQty,
        batchTotal,
        difference: batchTotal - itemQty,
        synced: batchTotal === itemQty
      }
    })
    .filter(item => !item.synced)

  console.log(`   Found ${syncIssues.length} items with sync issues:`)
  syncIssues.forEach(item => {
    console.log(`   - ${item.name}: Item shows ${item.itemQty}, batches total ${item.batchTotal} (diff: ${item.difference})`)
  })

  // 3. Check for location mismatches
  console.log('\n3. Checking for item-batch location mismatches...')
  const locationIssues = items
    .filter(item => item.useBatchSystem && item.locationId)
    .map(item => {
      const batchLocations = new Set(item.batches.map(b => b.locationId).filter(Boolean))
      const hasMultipleLocations = batchLocations.size > 1
      const itemLocationInBatches = item.batches.some(b => b.locationId === item.locationId)
      
      return {
        id: item.id,
        name: item.name,
        itemLocation: item.location?.name || 'None',
        batchLocations: Array.from(batchLocations),
        hasMultipleLocations,
        itemLocationInBatches,
        issue: hasMultipleLocations || !itemLocationInBatches
      }
    })
    .filter(item => item.issue)

  console.log(`   Found ${locationIssues.length} items with location issues:`)
  locationIssues.forEach(item => {
    console.log(`   - ${item.name}: Item location=${item.itemLocation}, Multiple batch locations=${item.hasMultipleLocations}`)
  })

  // 4. Check for batches without items
  console.log('\n4. Checking for orphaned batches...')
  const allBatchIds = batches.map(b => b.id)
  const orphanedBatches: any[] = []
  console.log(`   Found ${orphanedBatches.length} orphaned batches`)

  // 5. Check for items without locations but batches have locations
  console.log('\n5. Checking for items without location but batches have locations...')
  const itemsNoLocation = items
    .filter(item => !item.locationId && item.batches.some(b => b.locationId))
    .map(item => ({
      id: item.id,
      name: item.name,
      batchLocations: item.batches.filter(b => b.locationId).map(b => b.locationId)
    }))

  console.log(`   Found ${itemsNoLocation.length} items:`)
  itemsNoLocation.forEach(item => {
    console.log(`   - ${item.name}: No item location but ${item.batchLocations.length} batches have locations`)
  })

  // 6. Summary
  console.log('\n=== Summary ===')
  console.log(`Total items: ${items.length}`)
  console.log(`Items using batch system: ${items.filter(i => i.useBatchSystem).length}`)
  console.log(`Total batches: ${batches.length}`)
  console.log(`Duplicate batch groups: ${duplicates.length}`)
  console.log(`Items with sync issues: ${syncIssues.length}`)
  console.log(`Items with location issues: ${locationIssues.length}`)
  console.log(`Orphaned batches: ${orphanedBatches.length}`)
  console.log(`Items needing location assignment: ${itemsNoLocation.length}`)

  await prisma.$disconnect()
}

diagnoseIssues().catch(console.error)
