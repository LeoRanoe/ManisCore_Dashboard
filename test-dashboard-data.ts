// Quick test script to check batch and item data structure
import { prisma } from './lib/db'

async function testData() {
  console.log('\n=== CHECKING BATCHES ===')
  const batches = await prisma.stockBatch.findMany({
    where: { status: 'Arrived' },
    include: {
      location: true,
      item: true,
    },
    take: 5,
  })
  
  console.log(`Found ${batches.length} arrived batches`)
  batches.forEach(batch => {
    console.log(`\nBatch ID: ${batch.id}`)
    console.log(`  Item: ${batch.item?.name || 'N/A'}`)
    console.log(`  Location: ${batch.location?.name || 'NO LOCATION'}`)
    console.log(`  Quantity: ${batch.quantity}`)
    console.log(`  Cost/Unit: $${batch.costPerUnitUSD}`)
    console.log(`  Freight: $${batch.freightCostUSD}`)
    console.log(`  Status: ${batch.status}`)
  })

  console.log('\n=== CHECKING ITEMS ===')
  const items = await prisma.item.findMany({
    where: {
      status: 'Arrived',
      quantityInStock: { gt: 0 },
    },
    take: 5,
  })
  
  console.log(`Found ${items.length} arrived items with stock`)
  items.forEach(item => {
    console.log(`\nItem: ${item.name}`)
    console.log(`  Status: ${item.status}`)
    console.log(`  Quantity: ${item.quantityInStock}`)
    console.log(`  Cost/Unit: $${item.costPerUnitUSD}`)
    console.log(`  Selling Price: SRD ${item.sellingPriceSRD}`)
    console.log(`  Freight: $${item.freightCostUSD}`)
  })
  
  await prisma.$disconnect()
}

testData().catch(console.error)
