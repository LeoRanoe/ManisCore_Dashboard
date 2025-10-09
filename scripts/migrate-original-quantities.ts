import { prisma } from '../lib/db'

async function migrateOriginalQuantities() {
  try {
    console.log('Starting migration of originalQuantity field...')
    
    const batches = await prisma.stockBatch.findMany()
    console.log(`Found ${batches.length} batches to check`)
    
    let updated = 0
    for (const batch of batches) {
      if (batch.originalQuantity === 0 || batch.originalQuantity === null) {
        await prisma.stockBatch.update({
          where: { id: batch.id },
          data: { originalQuantity: batch.quantity }
        })
        updated++
      }
    }
    
    console.log(`✓ Updated ${updated} batches with originalQuantity`)
    console.log('Migration completed successfully!')
  } catch (error) {
    console.error('Error during migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

migrateOriginalQuantities()
