import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Clear existing data (optional - remove this if you want to keep existing data)
  await prisma.expense.deleteMany({})
  await prisma.item.deleteMany({})
  await prisma.location.deleteMany({})
  await prisma.user.deleteMany({})
  await prisma.company.deleteMany({})

  console.log('🗑️  Cleared existing data')

  // Create companies
  const companies = await Promise.all([
    prisma.company.create({
      data: {
        name: 'ManisCor',
        cashBalanceSRD: 25000.00, // SRD 25,000
        cashBalanceUSD: 2500.00,  // $2,500
        stockValueSRD: 150000.00, // SRD 150,000
        stockValueUSD: 3750.00,   // $3,750
      },
    }),
    prisma.company.create({
      data: {
        name: 'Bijoux Ayu',
        cashBalanceSRD: 18000.00, // SRD 18,000
        cashBalanceUSD: 1800.00,  // $1,800
        stockValueSRD: 120000.00, // SRD 120,000
        stockValueUSD: 3000.00,   // $3,000
      },
    }),
  ])

  console.log('✅ Companies created')

  // Create users - leonardo, aryan, tay, oresha
  const users = await Promise.all([
    prisma.user.create({
      data: {
        name: 'Leonardo',
        email: 'leonardo@maniscor.com',
        role: 'ADMIN',
        isActive: true,
        companyId: companies[0].id, // ManisCor
      },
    }),
    prisma.user.create({
      data: {
        name: 'Aryan',
        email: 'aryan@maniscor.com',
        role: 'MANAGER',
        isActive: true,
        companyId: companies[0].id, // ManisCor
      },
    }),
    prisma.user.create({
      data: {
        name: 'Tay',
        email: 'tay@bijouxayu.com',
        role: 'MANAGER',
        isActive: true,
        companyId: companies[1].id, // Bijoux Ayu
      },
    }),
    prisma.user.create({
      data: {
        name: 'Oresha',
        email: 'oresha@bijouxayu.com',
        role: 'STAFF',
        isActive: true,
        companyId: companies[1].id, // Bijoux Ayu
      },
    }),
  ])

  console.log('✅ Users created')

  // Create locations
  const locations = await Promise.all([
    prisma.location.create({
      data: {
        name: 'Leonardo\'s Warehouse',
        address: 'Main Storage Facility',
        description: 'Primary storage location for ManisCor inventory',
        isActive: true,
        companyId: companies[0].id, // ManisCor
        managerId: users[0].id, // Leonardo
      },
    }),
    prisma.location.create({
      data: {
        name: 'Aryan\'s Storage',
        address: 'Secondary Storage',
        description: 'Aryan\'s personal storage space',
        isActive: true,
        companyId: companies[0].id, // ManisCor
        managerId: users[1].id, // Aryan
      },
    }),
    prisma.location.create({
      data: {
        name: 'Tay\'s Boutique',
        address: 'Jewelry Display Center',
        description: 'Main display and sales location for Bijoux Ayu',
        isActive: true,
        companyId: companies[1].id, // Bijoux Ayu
        managerId: users[2].id, // Tay
      },
    }),
    prisma.location.create({
      data: {
        name: 'Oresha\'s Workshop',
        address: 'Creative Workshop Space',
        description: 'Design and crafting space',
        isActive: true,
        companyId: companies[1].id, // Bijoux Ayu
        managerId: users[3].id, // Oresha
      },
    }),
  ])

  console.log('✅ Locations created')

  // Create sample items for ManisCor (Audio products)
  const maniscorItems = [
    {
      name: 'KZ EDX Pro',
      status: 'Arrived' as const,
      quantityInStock: 15,
      costPerUnitUSD: 25,
      freightCostUSD: 37.5, // Total freight for this order
      sellingPriceSRD: 200,
      notes: 'Popular entry-level IEMs',
      companyId: companies[0].id,
      assignedUserId: users[1].id, // Aryan
      locationId: locations[1].id, // Aryan's Storage
    },
    {
      name: 'KZ Castor Pro',
      status: 'Ordered' as const,
      quantityInStock: 0,
      costPerUnitUSD: 45,
      freightCostUSD: 0,
      sellingPriceSRD: 360,
      notes: 'High-end bass-heavy IEMs',
      companyId: companies[0].id,
      assignedUserId: users[0].id, // Leonardo
      locationId: locations[0].id, // Leonardo's Warehouse
    },
    {
      name: 'KZ DQ6S',
      status: 'ToOrder' as const,
      quantityInStock: 0,
      costPerUnitUSD: 55,
      freightCostUSD: 0,
      sellingPriceSRD: 440,
      notes: 'Premium audiophile choice',
      companyId: companies[0].id,
      assignedUserId: users[0].id, // Leonardo
      locationId: locations[0].id, // Leonardo's Warehouse
    },
    {
      name: 'KZ PR2',
      status: 'Sold' as const,
      quantityInStock: 5, // Some remaining stock
      costPerUnitUSD: 20,
      freightCostUSD: 50.0,
      sellingPriceSRD: 160,
      notes: 'Budget-friendly option - fast seller',
      companyId: companies[0].id,
      assignedUserId: users[1].id, // Aryan
      locationId: locations[1].id, // Aryan's Storage
    },
  ]

  // Create sample items for Bijoux Ayu (Jewelry)
  const bijouxItems = [
    {
      name: 'Silver Heart Pendant',
      status: 'Arrived' as const,
      quantityInStock: 8,
      costPerUnitUSD: 15,
      freightCostUSD: 12.0,
      sellingPriceSRD: 120,
      notes: 'Elegant silver jewelry piece',
      companyId: companies[1].id,
      assignedUserId: users[2].id, // Tay
      locationId: locations[2].id, // Tay's Boutique
    },
    {
      name: 'Gold Ring Set',
      status: 'Arrived' as const,
      quantityInStock: 3,
      costPerUnitUSD: 85,
      freightCostUSD: 25.5,
      sellingPriceSRD: 680,
      notes: 'Premium gold ring collection',
      companyId: companies[1].id,
      assignedUserId: users[2].id, // Tay
      locationId: locations[2].id, // Tay's Boutique
    },
    {
      name: 'Crystal Earrings',
      status: 'ToOrder' as const,
      quantityInStock: 0,
      costPerUnitUSD: 22,
      freightCostUSD: 0,
      sellingPriceSRD: 180,
      notes: 'Custom crystal design',
      companyId: companies[1].id,
      assignedUserId: users[3].id, // Oresha
      locationId: locations[3].id, // Oresha's Workshop
    },
    {
      name: 'Handmade Bracelet',
      status: 'Arrived' as const,
      quantityInStock: 12,
      costPerUnitUSD: 8,
      freightCostUSD: 9.6,
      sellingPriceSRD: 65,
      notes: 'Artisan crafted bracelets',
      companyId: companies[1].id,
      assignedUserId: users[3].id, // Oresha
      locationId: locations[3].id, // Oresha's Workshop
    },
  ]

  // Create all items
  const allItems = [...maniscorItems, ...bijouxItems]

  for (const item of allItems) {
    const existing = await prisma.item.findFirst({
      where: { name: item.name },
    })
    
    if (!existing) {
      await prisma.item.create({
        data: item,
      })
    }
  }

  console.log('✅ Sample items created')
  console.log('')
  console.log('🎉 Database seeded successfully!')
  console.log('')
  console.log('📊 Summary:')
  console.log(`   Companies: ${companies.length}`)
  console.log(`   Users: ${users.length}`)
  console.log(`   Locations: ${locations.length}`)
  console.log(`   Items: ${allItems.length}`)
  console.log('')
  console.log('👥 User Credentials:')
  console.log('   Leonardo (ADMIN): leonardo@maniscor.com')
  console.log('   Aryan (MANAGER): aryan@maniscor.com')
  console.log('   Tay (MANAGER): tay@bijouxayu.com')
  console.log('   Oresha (STAFF): oresha@bijouxayu.com')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })