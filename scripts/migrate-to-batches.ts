import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateItemsToBatches() {
  console.log('🚀 Starting safe data migration to batch system...\n')

  try {
    // Step 1: Get all items with their data
    const allItems = await prisma.item.findMany({
      where: {
        quantityInStock: { gt: 0 }
      },
      include: {
        company: true,
        location: true,
        assignedUser: true
      }
    })

    console.log(`📦 Found ${allItems.length} items to migrate\n`)

    // Step 2: Create batches for each item
    let successCount = 0
    let skipCount = 0
    let errorCount = 0

    for (const item of allItems) {
      try {
        // Check if batch already exists for this item
        const existingBatch = await prisma.$queryRaw<{id: string}[]>`
          SELECT id FROM stock_batches WHERE "itemId" = ${item.id} LIMIT 1
        `

        if (existingBatch && existingBatch.length > 0) {
          console.log(`⏭️  Skipping ${item.name} - batch already exists`)
          skipCount++
          continue
        }

        // Create batch from item data using raw SQL
        await prisma.$executeRaw`
          INSERT INTO stock_batches (
            id, quantity, status, "costPerUnitUSD", "freightCostUSD",
            "orderDate", "expectedArrival", "orderNumber", notes,
            "createdAt", "updatedAt", "itemId", "locationId", "assignedUserId"
          )
          VALUES (
            gen_random_uuid(),
            ${item.quantityInStock || 0},
            ${item.status || 'ToOrder'}::"Status",
            ${item.costPerUnitUSD},
            ${item.freightCostUSD || 0},
            ${item.orderDate},
            ${item.expectedArrival},
            ${item.orderNumber},
            ${item.notes},
            ${new Date()},
            ${new Date()},
            ${item.id},
            ${item.locationId},
            ${item.assignedUserId}
          )
        `

        console.log(`✅ Created batch for: ${item.name} (${item.quantityInStock} units)`)
        successCount++
      } catch (error) {
        console.error(`❌ Error migrating ${item.name}:`, error)
        errorCount++
      }
    }

    console.log('\n📊 Migration Summary:')
    console.log(`   ✅ Successfully migrated: ${successCount} items`)
    console.log(`   ⏭️  Skipped (already exists): ${skipCount} items`)
    console.log(`   ❌ Errors: ${errorCount} items`)

    // Step 3: Verification
    console.log('\n🔍 Running verification checks...\n')

    const itemCount = await prisma.item.count()
    const batchCountResult = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(*) as count FROM stock_batches
    `
    const batchCount = Number(batchCountResult[0]?.count || 0)
    
    const itemsWithBatchesResult = await prisma.$queryRaw<{count: bigint}[]>`
      SELECT COUNT(DISTINCT "itemId") as count FROM stock_batches
    `
    const itemsWithBatches = Number(itemsWithBatchesResult[0]?.count || 0)

    console.log(`   Total items: ${itemCount}`)
    console.log(`   Total batches: ${batchCount}`)
    console.log(`   Items with batches: ${itemsWithBatches}`)

    // Verify quantities match
    const itemsToVerify = await prisma.item.findMany({
      where: { quantityInStock: { gt: 0 } }
    })

    let quantityMismatches = 0
    for (const item of itemsToVerify) {
      const batches = await prisma.$queryRaw<{quantity: number}[]>`
        SELECT SUM(quantity) as quantity 
        FROM stock_batches 
        WHERE "itemId" = ${item.id}
      `
      
      const oldQuantity = item.quantityInStock || 0
      const newQuantity = batches[0]?.quantity || 0
      
      if (oldQuantity !== newQuantity) {
        console.log(`   ⚠️  Quantity mismatch for ${item.name}: old=${oldQuantity}, new=${newQuantity}`)
        quantityMismatches++
      }
    }

    if (quantityMismatches === 0) {
      console.log('   ✅ All quantities match perfectly!')
    } else {
      console.log(`   ⚠️  Found ${quantityMismatches} quantity mismatches`)
    }

    console.log('\n✅ Migration completed successfully!')
    console.log('\n📝 Next steps:')
    console.log('   1. Review the migration results above')
    console.log('   2. Test the batch system with one item')
    console.log('   3. Gradually enable batch system for new items')
    console.log('   4. Old system remains available as fallback\n')

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run migration
migrateItemsToBatches()
  .then(() => {
    process.exit(0)
  })
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
