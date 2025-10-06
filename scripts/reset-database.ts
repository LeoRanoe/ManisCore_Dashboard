import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function resetDatabase() {
  try {
    console.log('🗑️  Starting database reset...')
    
    // Delete all data in order (due to foreign key constraints)
    console.log('Deleting all items...')
    await prisma.item.deleteMany({})
    
    console.log('Deleting all expenses...')
    await prisma.expense.deleteMany({})
    
    console.log('Deleting all locations...')
    await prisma.location.deleteMany({})
    
    console.log('Deleting all users...')
    await prisma.user.deleteMany({})
    
    console.log('Deleting all companies...')
    await prisma.company.deleteMany({})
    
    console.log('✅ Database reset completed successfully!')
    console.log('📊 All tables are now empty.')
    
  } catch (error) {
    console.error('❌ Error resetting database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the reset if this script is executed directly
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('🎉 Database reset operation completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Database reset failed:', error)
      process.exit(1)
    })
}

export { resetDatabase }