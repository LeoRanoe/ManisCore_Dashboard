const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create companies
  const maniscore = await prisma.company.upsert({
    where: { name: 'ManisCor' },
    update: {},
    create: {
      name: 'ManisCor',
    },
  })

  const bijouAyu = await prisma.company.upsert({
    where: { name: 'Bijoux Ayu' },
    update: {},
    create: {
      name: 'Bijoux Ayu',
    },
  })

  // Create sample items - KZ audio products for ManisCor
  const items = [
    {
      name: 'KZ EDX Pro',
      status: 'Arrived',
      quantityInStock: 15,
      costPerUnitUSD: 25,
      freightCostUSD: 37.5, // Total freight for this order (15 units)
      sellingPriceSRD: 200,
      companyId: maniscore.id,
    },
    {
      name: 'KZ Castor Pro',
      status: 'Arrived',
      quantityInStock: 12,
      costPerUnitUSD: 35,
      freightCostUSD: 36.0, // Total freight for this order (12 units)
      sellingPriceSRD: 280,
      companyId: maniscore.id,
    },
    {
      name: 'KZ Carol Pro',
      status: 'Arrived',
      quantityInStock: 8,
      costPerUnitUSD: 45,
      freightCostUSD: 28.0, // Total freight for this order (8 units)
      sellingPriceSRD: 360,
      companyId: maniscore.id,
    },
    {
      name: 'KZ ZSN Pro X',
      status: 'Ordered',
      quantityInStock: 0,
      costPerUnitUSD: 30,
      freightCostUSD: 0, // No freight yet as order hasn't arrived
      sellingPriceSRD: 240,
      companyId: maniscore.id,
    },
    {
      name: 'KZ DQ6S',
      status: 'ToOrder',
      quantityInStock: 0,
      costPerUnitUSD: 55,
      freightCostUSD: 0, // No freight yet as not ordered
      sellingPriceSRD: 440,
      companyId: maniscore.id,
    },
    {
      name: 'KZ PR2',
      status: 'Sold',
      quantityInStock: 25,
      costPerUnitUSD: 20,
      freightCostUSD: 50.0, // Total freight for this order (25 units)
      sellingPriceSRD: 160,
      companyId: maniscore.id,
    },
    // Bijoux Ayu has no items yet as the company hasn't started
  ]

  for (const item of items) {
    await prisma.item.upsert({
      where: { id: 'dummy' }, // This will always create new items since we don't have the ID
      update: {},
      create: item,
    })
  }

  console.log('✅ Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })