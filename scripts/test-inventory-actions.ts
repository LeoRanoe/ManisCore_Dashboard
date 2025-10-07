import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testInventoryActions() {
  console.log('Testing inventory actions with batch system...\n')

  // Get a test item
  const items = await prisma.item.findMany({
    where: { useBatchSystem: true },
    include: {
      batches: true,
    },
    take: 1,
  })

  if (items.length === 0) {
    console.log('❌ No items with useBatchSystem=true found')
    return
  }

  const testItem = items[0]
  console.log(`Testing with item: ${testItem.name}`)
  console.log(`Current quantityInStock: ${testItem.quantityInStock}`)
  console.log(`Current batches: ${testItem.batches.length}`)
  testItem.batches.forEach(b => {
    console.log(`  - Batch ${b.id.slice(0, 8)}: ${b.quantity} units, Status: ${b.status}`)
  })
  console.log()

  // Test 1: Add stock (should create new batch)
  console.log('TEST 1: Adding 5 units...')
  const addResponse = await fetch('http://localhost:3000/api/inventory/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'add',
      itemId: testItem.id,
      quantityToAdd: 5,
      reason: 'Test addition',
    }),
  })
  const addResult = await addResponse.json()
  console.log('Result:', addResult.success ? '✅ Success' : '❌ Failed')
  if (addResult.success) {
    console.log(`  New stock: ${addResult.addition.newStock}`)
    console.log(`  Batch created: ${addResult.addition.batchId?.slice(0, 8) || 'N/A'}`)
  } else {
    console.log(`  Error: ${addResult.error}`)
  }
  console.log()

  // Verify after add
  const afterAdd = await prisma.item.findUnique({
    where: { id: testItem.id },
    include: { batches: true },
  })
  console.log(`After add: Item quantity = ${afterAdd?.quantityInStock}, Batches = ${afterAdd?.batches.length}`)
  console.log()

  // Test 2: Remove stock (should reduce/delete batches using FIFO)
  console.log('TEST 2: Removing 2 units...')
  const removeResponse = await fetch('http://localhost:3000/api/inventory/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'remove',
      itemId: testItem.id,
      quantityToRemove: 2,
      reason: 'Test removal',
    }),
  })
  const removeResult = await removeResponse.json()
  console.log('Result:', removeResult.success ? '✅ Success' : '❌ Failed')
  if (removeResult.success) {
    console.log(`  Remaining stock: ${removeResult.removal.remainingStock}`)
    console.log(`  Batches affected: ${removeResult.removal.batchesAffected}`)
  } else {
    console.log(`  Error: ${removeResult.error}`)
  }
  console.log()

  // Verify after remove
  const afterRemove = await prisma.item.findUnique({
    where: { id: testItem.id },
    include: { batches: true },
  })
  console.log(`After remove: Item quantity = ${afterRemove?.quantityInStock}, Batches = ${afterRemove?.batches.length}`)
  console.log()

  // Test 3: Sell stock (should mark batches as Sold using FIFO)
  console.log('TEST 3: Selling 1 unit...')
  const sellResponse = await fetch('http://localhost:3000/api/inventory/actions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'sell',
      itemId: testItem.id,
      quantityToSell: 1,
      sellingPriceSRD: testItem.sellingPriceSRD,
    }),
  })
  const sellResult = await sellResponse.json()
  console.log('Result:', sellResult.success ? '✅ Success' : '❌ Failed')
  if (sellResult.success) {
    console.log(`  Remaining stock: ${sellResult.sale.remainingStock}`)
    console.log(`  Revenue: SRD ${sellResult.sale.totalRevenue}`)
    console.log(`  Batches affected: ${sellResult.sale.batchesAffected}`)
  } else {
    console.log(`  Error: ${sellResult.error}`)
  }
  console.log()

  // Final verification
  const finalState = await prisma.item.findUnique({
    where: { id: testItem.id },
    include: { 
      batches: {
        orderBy: { createdAt: 'asc' }
      }
    },
  })
  console.log('=== FINAL STATE ===')
  console.log(`Item quantity: ${finalState?.quantityInStock}`)
  console.log(`Total batches: ${finalState?.batches.length}`)
  finalState?.batches.forEach(b => {
    console.log(`  - Batch ${b.id.slice(0, 8)}: ${b.quantity} units, Status: ${b.status}`)
  })
  
  // Verify consistency
  const batchTotal = finalState?.batches
    .filter(b => b.status !== 'Sold')
    .reduce((sum, b) => sum + b.quantity, 0) || 0
  
  if (batchTotal === finalState?.quantityInStock) {
    console.log('\n✅ Stock quantity matches batch totals!')
  } else {
    console.log(`\n❌ MISMATCH: Item=${finalState?.quantityInStock}, Active Batches=${batchTotal}`)
  }
}

// Note: This test requires the dev server to be running
console.log('⚠️  Make sure the dev server is running (npm run dev) before running this test\n')

testInventoryActions()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
