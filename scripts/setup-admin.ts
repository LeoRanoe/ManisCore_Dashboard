import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const ADMIN_EMAIL = 'admin@maniscor.com'

async function setupAdmin() {
  try {
    // Hash the password
    const hashedPassword = await hash('admin123', 10)

    // Create or update admin user (without company)
    const admin = await prisma.user.upsert({
      where: { email: ADMIN_EMAIL },
      update: {
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        companyId: null, // Admin has no company
      },
      create: {
        name: 'System Administrator',
        email: ADMIN_EMAIL,
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        companyId: null, // Admin has no company
      },
    })

    console.log('✅ Default admin user created/updated:')
    console.log('   Email: admin@maniscor.com')
    console.log('   Password: admin123')
    console.log('   Role:', admin.role)
    console.log('   Company: None (System Admin)')
    console.log('\n⚠️  IMPORTANT: This admin cannot be deleted from the system')
  } catch (error) {
    console.error('❌ Error setting up admin user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setupAdmin()
