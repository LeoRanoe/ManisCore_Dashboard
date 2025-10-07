import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixStockConsistency() {
  console.log('Fixing stock consistency...\n')

  // Get all items
  const items = await prisma.item.findMany({
    include: {
      batches: true,
    },
  })

  console.log(`Processing ${items.length} items...\n`)

  for (const item of items) {
    const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
    const itemStock = item.quantityInStock || 0
    const hasBatches = item.batches.length > 0

    console.log(`Processing: ${item.name}`)
    console.log(`  Current Item.quantityInStock: ${itemStock}`)
    console.log(`  Actual total from batches: ${batchTotal}`)
    console.log(`  Has batches: ${hasBatches}`)
    console.log(`  Current useBatchSystem: ${item.useBatchSystem}`)

    // Update the item
    if (hasBatches) {
      await prisma.item.update({
        where: { id: item.id },
        data: {
          useBatchSystem: true,  // Enable batch system
          quantityInStock: batchTotal,  // Sync quantity with batches
        },
      })
      console.log(`  ✅ Updated: useBatchSystem=true, quantityInStock=${batchTotal}`)
    } else {
      console.log(`  ⚠️  No batches found, keeping useBatchSystem=false`)
    }
    
    console.log()
  }

  console.log('\n=== VERIFICATION ===')
  const updatedItems = await prisma.item.findMany({
    include: {
      batches: true,
    },
  })

  let allGood = true
  for (const item of updatedItems) {
    const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
    const itemStock = item.quantityInStock || 0

    if (item.batches.length > 0) {
      if (itemStock !== batchTotal || !item.useBatchSystem) {
        console.log(`❌ ${item.name}: STILL MISMATCH - Item=${itemStock}, Batches=${batchTotal}, useBatchSystem=${item.useBatchSystem}`)
        allGood = false
      } else {
        console.log(`✅ ${item.name}: OK - ${itemStock} units (useBatchSystem=true)`)
      }
    }
  }

  if (allGood) {
    console.log('\n✅ All stock quantities are now consistent!')
  } else {
    console.log('\n⚠️  Some items still have issues')
  }
}

fixStockConsistency()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
