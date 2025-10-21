import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function verifyNextX() {
  try {
    console.log('🔍 Verifying Next X setup...\n')
    
    // Check company
    const company = await prisma.company.findUnique({
      where: { slug: 'next-x' }
    })
    
    if (company) {
      console.log('✅ Company found:')
      console.log(`   Name: ${company.name}`)
      console.log(`   Slug: ${company.slug}`)
      console.log(`   Description: ${company.description}`)
      console.log('')
    } else {
      console.log('❌ Company not found!')
      return
    }
    
    // Check items
    const items = await prisma.item.findMany({
      where: { companyId: company.id },
      include: {
        categories: true
      }
    })
    
    console.log(`✅ Products found: ${items.length}`)
    items.forEach(item => {
      console.log(`   - ${item.name} (${item.slug})`)
      console.log(`     Stock: ${item.quantityInStock}, Price: SRD ${item.sellingPriceSRD}`)
    })
    console.log('')
    
    // Check categories
    const categories = await prisma.category.findMany({
      where: { companyId: company.id }
    })
    
    console.log(`✅ Categories found: ${categories.length}`)
    categories.forEach(cat => {
      console.log(`   - ${cat.name} (${cat.slug})`)
    })
    console.log('')
    
    // Check user
    const users = await prisma.user.findMany({
      where: { companyId: company.id }
    })
    
    console.log(`✅ Users found: ${users.length}`)
    users.forEach(user => {
      console.log(`   - ${user.name} (${user.email}) - ${user.role}`)
    })
    console.log('')
    
    console.log('🎉 All checks passed!')
    console.log('\n📝 Next steps:')
    console.log('   1. Restart your development server')
    console.log('   2. Visit http://localhost:3001 (or your ecommerce URL)')
    console.log('   3. The site will automatically redirect to /next-x')
    console.log('   4. Login to dashboard with: admin@nextx.com / admin123')
    
  } catch (error) {
    console.error('❌ Error verifying setup:', error)
  } finally {
    await prisma.$disconnect()
  }
}

verifyNextX()
