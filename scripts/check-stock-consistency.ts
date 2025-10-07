import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStockConsistency() {
  console.log('Checking stock consistency between Items and Batches...\n')

  // Get all items
  const items = await prisma.item.findMany({
    include: {
      batches: true,
    },
  })

  console.log(`Total items: ${items.length}\n`)

  for (const item of items) {
    const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
    const itemStock = item.quantityInStock || 0
    const usingBatchSystem = item.useBatchSystem

    console.log(`Item: ${item.name}`)
    console.log(`  useBatchSystem: ${usingBatchSystem}`)
    console.log(`  Item quantityInStock: ${itemStock}`)
    console.log(`  Total from batches: ${batchTotal}`)
    console.log(`  Batches count: ${item.batches.length}`)
    
    if (item.batches.length > 0) {
      item.batches.forEach(batch => {
        console.log(`    - Batch ${batch.id}: ${batch.quantity} units, Status: ${batch.status}, Location: ${batch.locationId || 'None'}`)
      })
    }

    if (itemStock !== batchTotal) {
      console.log(`  ⚠️  MISMATCH! Item shows ${itemStock} but batches total ${batchTotal}`)
    }
    
    console.log()
  }

  // Summary
  const itemsWithBatches = items.filter(i => i.batches.length > 0)
  const itemsUsingBatchSystem = items.filter(i => i.useBatchSystem)
  const mismatches = items.filter(i => {
    const batchTotal = i.batches.reduce((sum, batch) => sum + batch.quantity, 0)
    return (i.quantityInStock || 0) !== batchTotal
  })

  console.log('\n=== SUMMARY ===')
  console.log(`Items with batches: ${itemsWithBatches.length}`)
  console.log(`Items marked as useBatchSystem: ${itemsUsingBatchSystem.length}`)
  console.log(`Items with mismatched quantities: ${mismatches.length}`)

  if (mismatches.length > 0) {
    console.log('\n⚠️  Items with quantity mismatches:')
    mismatches.forEach(item => {
      const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
      console.log(`  - ${item.name}: Item=${item.quantityInStock || 0}, Batches=${batchTotal}`)
    })
  }
}

checkStockConsistency()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
