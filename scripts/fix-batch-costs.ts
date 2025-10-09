/**
 * Script to fix batch costs by copying from parent items
 * 
 * This script updates all batches that have costPerUnitUSD = 0
 * by copying the cost from their parent item.
 * 
 * Run this with: npx tsx scripts/fix-batch-costs.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixBatchCosts() {
  console.log('🔍 Starting batch cost fix...\n')

  try {
    // Find all items with batches
    const items = await prisma.item.findMany({
      where: {
        useBatchSystem: true,
      },
      include: {
        batches: true,
      },
    })

    console.log(`Found ${items.length} items using batch system\n`)

    let fixedCount = 0
    let totalBatches = 0

    for (const item of items) {
      const batchesNeedingFix = item.batches.filter(b => b.costPerUnitUSD === 0)
      
      if (batchesNeedingFix.length > 0) {
        console.log(`\n📦 Item: ${item.name}`)
        console.log(`   Item Cost: $${item.costPerUnitUSD}`)
        console.log(`   Batches needing fix: ${batchesNeedingFix.length}`)

        for (const batch of batchesNeedingFix) {
          await prisma.stockBatch.update({
            where: { id: batch.id },
            data: {
              costPerUnitUSD: item.costPerUnitUSD,
            },
          })

          console.log(`   ✅ Updated batch ${batch.id}: $0 → $${item.costPerUnitUSD}`)
          fixedCount++
        }
      }

      totalBatches += item.batches.length
    }

    console.log(`\n✨ Complete!`)
    console.log(`   Total batches: ${totalBatches}`)
    console.log(`   Batches fixed: ${fixedCount}`)
    console.log(`   Batches already OK: ${totalBatches - fixedCount}`)

  } catch (error) {
    console.error('❌ Error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

fixBatchCosts()
  .then(() => {
    console.log('\n✅ Script completed successfully')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
