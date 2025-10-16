import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Starting database cleanup...\n');

  try {
    // Delete in order to respect foreign key constraints
    console.log('Clearing NewsletterSubscriber...');
    await prisma.newsletterSubscriber.deleteMany({});
    
    console.log('Clearing Category...');
    await prisma.category.deleteMany({});
    
    console.log('Clearing Testimonial...');
    await prisma.testimonial.deleteMany({});
    
    console.log('Clearing Banner...');
    await prisma.banner.deleteMany({});
    
    console.log('Clearing FAQ...');
    await prisma.fAQ.deleteMany({});
    
    console.log('Clearing Review...');
    await prisma.review.deleteMany({});
    
    console.log('Clearing StockBatch...');
    await prisma.stockBatch.deleteMany({});
    
    console.log('Clearing Item...');
    await prisma.item.deleteMany({});
    
    console.log('Clearing Expense...');
    await prisma.expense.deleteMany({});
    
    console.log('Clearing Location...');
    await prisma.location.deleteMany({});
    
    console.log('Clearing User...');
    await prisma.user.deleteMany({});
    
    console.log('Clearing Company...');
    await prisma.company.deleteMany({});
    
    console.log('\n✅ Database cleared successfully!');
    console.log('All data has been removed while keeping the schema intact.');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
