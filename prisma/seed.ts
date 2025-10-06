import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Create sample companies
  const companies = await Promise.all([
    prisma.company.upsert({
      where: { name: 'TechCorp' },
      update: {},
      create: {
        name: 'TechCorp',
      },
    }),
    prisma.company.upsert({
      where: { name: 'RetailPlus' },
      update: {},
      create: {
        name: 'RetailPlus',
      },
    }),
    prisma.company.upsert({
      where: { name: 'GlobalTrade' },
      update: {},
      create: {
        name: 'GlobalTrade',
      },
    }),
  ])

  // Create sample items
  const items = [
    {
      name: 'Laptop Dell XPS 13',
      status: 'Arrived' as const,
      quantityInStock: 15,
      costPerUnitUSD: 800,
      freightPerUnitUSD: 50,
      sellingPriceSRD: 3200,
      companyId: companies[0].id,
    },
    {
      name: 'iPhone 15 Pro',
      status: 'ToOrder' as const,
      quantityInStock: 0,
      costPerUnitUSD: 999,
      freightPerUnitUSD: 25,
      sellingPriceSRD: 4200,
      companyId: companies[0].id,
    },
    {
      name: 'Samsung Galaxy S24',
      status: 'Ordered' as const,
      quantityInStock: 0,
      costPerUnitUSD: 750,
      freightPerUnitUSD: 30,
      sellingPriceSRD: 3500,
      companyId: companies[1].id,
    },
    {
      name: 'Nike Air Max Sneakers',
      status: 'Arrived' as const,
      quantityInStock: 25,
      costPerUnitUSD: 80,
      freightPerUnitUSD: 15,
      sellingPriceSRD: 450,
      companyId: companies[1].id,
    },
    {
      name: 'Gaming Chair Pro',
      status: 'Sold' as const,
      quantityInStock: 2,
      costPerUnitUSD: 150,
      freightPerUnitUSD: 35,
      sellingPriceSRD: 850,
      companyId: companies[2].id,
    },
    {
      name: 'Wireless Headphones',
      status: 'Arrived' as const,
      quantityInStock: 8,
      costPerUnitUSD: 120,
      freightPerUnitUSD: 20,
      sellingPriceSRD: 650,
      companyId: companies[2].id,
    },
  ]

  for (const item of items) {
    const existing = await prisma.item.findFirst({
      where: { name: item.name },
    })
    
    if (!existing) {
      await prisma.item.create({
        data: item,
      })
    }
  }

  console.log('Database seeded successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })