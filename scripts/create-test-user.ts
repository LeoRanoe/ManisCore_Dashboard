import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

async function createTestUser() {
  try {
    // Get the first company or create one if none exists
    let company = await prisma.company.findFirst()
    
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: 'Test Company',
          cashBalanceSRD: 0,
          cashBalanceUSD: 0,
          stockValueSRD: 0,
          stockValueUSD: 0,
        },
      })
      console.log('✅ Created test company:', company.name)
    }

    // Hash the password
    const hashedPassword = await hash('password123', 10)

    // Create or update admin user
    const user = await prisma.user.upsert({
      where: { email: 'admin@maniscore.com' },
      update: {
        password: hashedPassword,
      },
      create: {
        name: 'Admin User',
        email: 'admin@maniscore.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        companyId: company.id,
      },
    })

    console.log('✅ Test user created/updated:')
    console.log('   Email: admin@maniscore.com')
    console.log('   Password: password123')
    console.log('   Role:', user.role)
  } catch (error) {
    console.error('❌ Error creating test user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createTestUser()
