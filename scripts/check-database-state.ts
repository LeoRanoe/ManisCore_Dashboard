import { prisma } from '../lib/db'

async function checkDatabase() {
  console.log('=== Database Items and Batches ===\n')
  
  const items = await prisma.item.findMany({
    include: {
      batches: {
        include: {
          location: true
        }
      },
      location: true
    }
  })

  items.forEach(item => {
    console.log(`\n${item.name}:`)
    console.log(`  Item location: ${item.location?.name || 'None'}`)
    console.log(`  Total quantity: ${item.quantityInStock}`)
    console.log(`  Batches (${item.batches.length}):`)
    item.batches.forEach(batch => {
      console.log(`    - ${batch.quantity} units at ${batch.location?.name || 'None'} (status: ${batch.status})`)
    })
  })

  await prisma.$disconnect()
}

checkDatabase().catch(console.error)
