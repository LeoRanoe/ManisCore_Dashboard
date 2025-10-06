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

  const techCorp = await prisma.company.upsert({
    where: { name: 'TechCorp' },
    update: {},
    create: {
      name: 'TechCorp',
    },
  })

  const electronics = await prisma.company.upsert({
    where: { name: 'Electronics Plus' },
    update: {},
    create: {
      name: 'Electronics Plus',
    },
  })

  // Create sample items
  const items = [
    {
      name: 'iPhone 15 Pro',
      status: 'Arrived',
      quantityInStock: 25,
      costPerUnitUSD: 800,
      freightPerUnitUSD: 20,
      sellingPriceSRD: 6000,
      companyId: maniscore.id,
    },
    {
      name: 'Samsung Galaxy S24',
      status: 'Ordered',
      quantityInStock: 0,
      costPerUnitUSD: 750,
      freightPerUnitUSD: 18,
      sellingPriceSRD: 5800,
      companyId: maniscore.id,
    },
    {
      name: 'MacBook Pro M3',
      status: 'ToOrder',
      quantityInStock: 3,
      costPerUnitUSD: 1500,
      freightPerUnitUSD: 50,
      sellingPriceSRD: 12000,
      companyId: techCorp.id,
    },
    {
      name: 'Dell XPS 13',
      status: 'Arrived',
      quantityInStock: 8,
      costPerUnitUSD: 1200,
      freightPerUnitUSD: 40,
      sellingPriceSRD: 9500,
      companyId: techCorp.id,
    },
    {
      name: 'AirPods Pro 2',
      status: 'Sold',
      quantityInStock: 50,
      costPerUnitUSD: 180,
      freightPerUnitUSD: 5,
      sellingPriceSRD: 1400,
      companyId: electronics.id,
    },
    {
      name: 'Sony WH-1000XM5',
      status: 'Arrived',
      quantityInStock: 2,
      costPerUnitUSD: 280,
      freightPerUnitUSD: 8,
      sellingPriceSRD: 2200,
      companyId: electronics.id,
    },
    {
      name: 'iPad Air M2',
      status: 'ToOrder',
      quantityInStock: 1,
      costPerUnitUSD: 600,
      freightPerUnitUSD: 15,
      sellingPriceSRD: 4800,
      companyId: maniscore.id,
    },
    {
      name: 'Surface Laptop 5',
      status: 'Ordered',
      quantityInStock: 0,
      costPerUnitUSD: 1000,
      freightPerUnitUSD: 30,
      sellingPriceSRD: 8000,
      companyId: techCorp.id,
    },
    {
      name: 'Apple Watch Series 9',
      status: 'Arrived',
      quantityInStock: 15,
      costPerUnitUSD: 350,
      freightPerUnitUSD: 10,
      sellingPriceSRD: 2800,
      companyId: electronics.id,
    },
    {
      name: 'Google Pixel 8',
      status: 'Sold',
      quantityInStock: 30,
      costPerUnitUSD: 600,
      freightPerUnitUSD: 15,
      sellingPriceSRD: 4500,
      companyId: maniscore.id,
    },
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