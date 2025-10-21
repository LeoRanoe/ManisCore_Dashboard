import { PrismaClient, Status } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function seedNextXWithIEMs() {
  try {
    console.log('🗑️  Clearing existing data...')
    
    // Delete all data in order (due to foreign key constraints)
    await prisma.review.deleteMany({})
    await prisma.fAQ.deleteMany({})
    await prisma.banner.deleteMany({})
    await prisma.testimonial.deleteMany({})
    await prisma.newsletterSubscriber.deleteMany({})
    await prisma.stockBatch.deleteMany({})
    await prisma.item.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.expense.deleteMany({})
    await prisma.location.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.company.deleteMany({})
    
    console.log('✅ Database cleared!')
    
    // Create Next X Company
    console.log('🏢 Creating Next X company...')
    const company = await prisma.company.create({
      data: {
        name: 'Next X',
        slug: 'next-x',
        description: 'Premium IEM (In-Ear Monitor) specialist, featuring KZ audio products and audiophile gear',
        logoUrl: null,
        bannerUrl: null,
        contactEmail: 'info@nextx.com',
        contactPhone: '+1-555-0123',
        isPublic: true,
        cashBalanceSRD: 0,
        cashBalanceUSD: 0,
        stockValueSRD: 0,
        stockValueUSD: 0,
        socialMedia: {
          facebook: 'https://facebook.com/nextx',
          instagram: 'https://instagram.com/nextx',
          twitter: 'https://twitter.com/nextx'
        },
        themeConfig: {
          primaryColor: '#3b82f6',
          secondaryColor: '#8b5cf6'
        },
        // Ecommerce Fields
        businessHours: {
          monday: '9:00 AM - 6:00 PM',
          tuesday: '9:00 AM - 6:00 PM',
          wednesday: '9:00 AM - 6:00 PM',
          thursday: '9:00 AM - 6:00 PM',
          friday: '9:00 AM - 6:00 PM',
          saturday: '10:00 AM - 4:00 PM',
          sunday: 'Closed'
        },
        heroTitle: 'Discover Premium Audio with Next X',
        heroSubtitle: 'Your trusted source for KZ IEMs and audiophile gear',
        aboutUs: 'Next X is dedicated to bringing the best in-ear monitors to audiophiles and music enthusiasts. We specialize in KZ audio products, known for their exceptional sound quality and value.',
        metaDescription: 'Shop premium KZ IEMs and in-ear monitors at Next X. High-quality audio products for audiophiles.',
        metaKeywords: ['IEM', 'KZ', 'in-ear monitors', 'audiophile', 'earphones', 'headphones', 'audio gear'],
        shippingPolicy: 'We offer fast and reliable shipping. Standard shipping takes 3-5 business days. Express shipping available.',
        returnPolicy: '30-day return policy. Items must be in original condition with all packaging.',
        warrantyInfo: 'All products come with manufacturer warranty. Extended warranty available for purchase.',
        termsOfService: 'By using our services, you agree to our terms and conditions.',
        privacyPolicy: 'We respect your privacy and protect your personal information.'
      }
    })
    console.log(`✅ Company created: ${company.name} (${company.slug})`)
    
    // Create Admin User
    console.log('👤 Creating admin user...')
    const hashedPassword = await bcrypt.hash('admin123', 10)
    const adminUser = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@nextx.com',
        password: hashedPassword,
        role: 'ADMIN',
        isActive: true,
        companyId: company.id
      }
    })
    console.log(`✅ Admin user created: ${adminUser.email}`)
    
    // Create Main Location
    console.log('📍 Creating main store location...')
    const location = await prisma.location.create({
      data: {
        name: 'Main Store',
        address: '123 Audio Street, Music City',
        description: 'Our flagship store location',
        isActive: true,
        companyId: company.id,
        managerId: adminUser.id
      }
    })
    console.log(`✅ Location created: ${location.name}`)
    
    // Create IEM Categories
    console.log('📂 Creating categories...')
    const categories = await Promise.all([
      prisma.category.create({
        data: {
          name: 'In-Ear Monitors (IEMs)',
          slug: 'iems',
          description: 'Premium in-ear monitors for audiophiles and music enthusiasts',
          isPublic: true,
          order: 1,
          companyId: company.id,
          metaTitle: 'In-Ear Monitors - Next X',
          metaDescription: 'Browse our collection of premium IEMs'
        }
      }),
      prisma.category.create({
        data: {
          name: 'KZ Audio',
          slug: 'kz-audio',
          description: 'KZ brand in-ear monitors - exceptional sound quality and value',
          isPublic: true,
          order: 2,
          companyId: company.id,
          metaTitle: 'KZ Audio Products - Next X',
          metaDescription: 'Shop KZ IEMs and audio products'
        }
      }),
      prisma.category.create({
        data: {
          name: 'Audio Accessories',
          slug: 'audio-accessories',
          description: 'Cables, ear tips, cases, and more',
          isPublic: true,
          order: 3,
          companyId: company.id
        }
      })
    ])
    console.log(`✅ Created ${categories.length} categories`)
    
    // Create KZ IEM Products
    console.log('🎧 Creating KZ IEM products...')
    const iemProducts = [
      {
        name: 'KZ ZSN Pro X',
        slug: 'kz-zsn-pro-x',
        description: 'Hybrid driver IEM with 1 dynamic driver and 1 balanced armature. Perfect balance of bass and clarity.',
        shortDescription: 'Popular hybrid IEM with punchy bass and clear highs',
        costPerUnitUSD: 15.99,
        sellingPriceSRD: 120.00,
        quantityInStock: 25,
        status: 'Arrived' as Status,
        specifications: {
          driver: 'Hybrid (1DD + 1BA)',
          impedance: '24Ω',
          sensitivity: '112dB',
          frequency: '20Hz - 40kHz',
          cable: 'Detachable 2-pin',
          connector: '3.5mm'
        },
        tags: ['KZ', 'IEM', 'Hybrid', 'Budget', 'Bestseller'],
        isFeatured: true,
        isPublic: true,
        categories: [categories[0].id, categories[1].id]
      },
      {
        name: 'KZ ZS10 Pro',
        slug: 'kz-zs10-pro',
        description: 'Premium 5-driver configuration (4BA + 1DD) delivering exceptional detail and soundstage.',
        shortDescription: 'Premium 5-driver IEM for audiophiles',
        costPerUnitUSD: 35.99,
        sellingPriceSRD: 280.00,
        quantityInStock: 15,
        status: 'Arrived' as Status,
        specifications: {
          driver: 'Hybrid (1DD + 4BA)',
          impedance: '32Ω',
          sensitivity: '110dB',
          frequency: '7Hz - 40kHz',
          cable: 'Detachable 2-pin',
          connector: '3.5mm'
        },
        tags: ['KZ', 'IEM', 'Hybrid', 'Premium', 'Audiophile'],
        isFeatured: true,
        isPublic: true,
        categories: [categories[0].id, categories[1].id]
      },
      {
        name: 'KZ EDX Pro',
        slug: 'kz-edx-pro',
        description: 'Entry-level single dynamic driver IEM with impressive sound quality for the price.',
        shortDescription: 'Affordable single DD IEM with great sound',
        costPerUnitUSD: 8.99,
        sellingPriceSRD: 75.00,
        quantityInStock: 40,
        status: 'Arrived' as Status,
        specifications: {
          driver: 'Single Dynamic Driver',
          impedance: '23Ω',
          sensitivity: '112dB',
          frequency: '20Hz - 40kHz',
          cable: 'Fixed',
          connector: '3.5mm'
        },
        tags: ['KZ', 'IEM', 'Budget', 'Entry-level', 'Single DD'],
        isFeatured: false,
        isPublic: true,
        categories: [categories[0].id, categories[1].id]
      },
      {
        name: 'KZ ZEX Pro',
        slug: 'kz-zex-pro',
        description: 'Tribrid configuration with electrostatic, balanced armature, and dynamic drivers for ultimate clarity.',
        shortDescription: 'Tribrid IEM with electrostatic driver',
        costPerUnitUSD: 42.99,
        sellingPriceSRD: 340.00,
        quantityInStock: 10,
        status: 'Arrived' as Status,
        specifications: {
          driver: 'Tribrid (1DD + 1BA + 1EST)',
          impedance: '24Ω',
          sensitivity: '112dB',
          frequency: '20Hz - 40kHz',
          cable: 'Detachable 2-pin',
          connector: '3.5mm'
        },
        tags: ['KZ', 'IEM', 'Tribrid', 'Premium', 'Electrostatic', 'Flagship'],
        isFeatured: true,
        isPublic: true,
        categories: [categories[0].id, categories[1].id]
      },
      {
        name: 'KZ AS16 Pro',
        slug: 'kz-as16-pro',
        description: '16 balanced armature drivers delivering pristine detail and clarity for critical listening.',
        shortDescription: '16BA flagship IEM for ultimate detail',
        costPerUnitUSD: 65.99,
        sellingPriceSRD: 520.00,
        quantityInStock: 8,
        status: 'Arrived' as Status,
        specifications: {
          driver: '16 Balanced Armature',
          impedance: '36Ω',
          sensitivity: '109dB',
          frequency: '20Hz - 40kHz',
          cable: 'Detachable 2-pin',
          connector: '3.5mm'
        },
        tags: ['KZ', 'IEM', 'All BA', 'Premium', 'Flagship', 'Audiophile'],
        isFeatured: true,
        isPublic: true,
        categories: [categories[0].id, categories[1].id]
      },
      {
        name: 'KZ ZSX Terminator',
        slug: 'kz-zsx-terminator',
        description: 'Hybrid 6-driver configuration with 5BA + 1DD for balanced and powerful sound.',
        shortDescription: 'Powerful 6-driver hybrid IEM',
        costPerUnitUSD: 29.99,
        sellingPriceSRD: 240.00,
        quantityInStock: 12,
        status: 'Arrived' as Status,
        specifications: {
          driver: 'Hybrid (1DD + 5BA)',
          impedance: '24Ω',
          sensitivity: '111dB',
          frequency: '20Hz - 40kHz',
          cable: 'Detachable 2-pin',
          connector: '3.5mm'
        },
        tags: ['KZ', 'IEM', 'Hybrid', 'Multi-driver'],
        isFeatured: false,
        isPublic: true,
        categories: [categories[0].id, categories[1].id]
      },
      {
        name: 'KZ Upgrade Cable',
        slug: 'kz-upgrade-cable',
        description: 'High-quality silver-plated copper upgrade cable with 2-pin connector.',
        shortDescription: 'Premium upgrade cable for KZ IEMs',
        costPerUnitUSD: 12.99,
        sellingPriceSRD: 95.00,
        quantityInStock: 30,
        status: 'Arrived' as Status,
        specifications: {
          material: 'Silver-plated Copper',
          connector: '2-pin 0.78mm',
          length: '1.2m',
          plug: '3.5mm gold-plated'
        },
        tags: ['KZ', 'Cable', 'Accessory', 'Upgrade'],
        isFeatured: false,
        isPublic: true,
        categories: [categories[2].id]
      },
      {
        name: 'Memory Foam Ear Tips (3 Pairs)',
        slug: 'memory-foam-ear-tips',
        description: 'Premium memory foam ear tips for enhanced comfort and noise isolation.',
        shortDescription: 'Comfortable memory foam tips',
        costPerUnitUSD: 6.99,
        sellingPriceSRD: 55.00,
        quantityInStock: 50,
        status: 'Arrived' as Status,
        specifications: {
          material: 'Memory Foam',
          sizes: 'S, M, L',
          compatibility: 'Universal fit'
        },
        tags: ['Ear Tips', 'Accessory', 'Comfort'],
        isFeatured: false,
        isPublic: true,
        categories: [categories[2].id]
      }
    ]
    
    for (const product of iemProducts) {
      const { categories: categoryIds, ...productData } = product
      const item = await prisma.item.create({
        data: {
          ...productData,
          companyId: company.id,
          locationId: location.id,
          assignedUserId: adminUser.id,
          freightCostUSD: 2.00,
          minStockLevel: 5,
          useBatchSystem: true,
          seoTitle: `${product.name} - Next X`,
          seoDescription: product.shortDescription,
          categories: {
            connect: categoryIds.map(id => ({ id }))
          }
        }
      })
      
      // Create initial stock batch
      await prisma.stockBatch.create({
        data: {
          quantity: product.quantityInStock,
          originalQuantity: product.quantityInStock,
          status: 'Arrived' as Status,
          costPerUnitUSD: product.costPerUnitUSD,
          freightCostUSD: 2.00,
          orderDate: new Date(),
          arrivedDate: new Date(),
          itemId: item.id,
          locationId: location.id,
          assignedUserId: adminUser.id
        }
      })
      
      console.log(`  ✅ Created: ${item.name}`)
    }
    
    // Create some FAQs
    console.log('❓ Creating FAQs...')
    await prisma.fAQ.createMany({
      data: [
        {
          question: 'What are IEMs?',
          answer: 'IEM stands for In-Ear Monitor. They are professional-grade earphones originally designed for musicians and audio engineers, now popular among audiophiles for their superior sound quality.',
          category: 'Products',
          order: 1,
          isPublic: true,
          companyId: company.id
        },
        {
          question: 'Why choose KZ IEMs?',
          answer: 'KZ (Knowledge Zenith) offers exceptional value for money with multiple driver configurations, premium build quality, and sound that rivals much more expensive brands. They\'re perfect for both beginners and experienced audiophiles.',
          category: 'Products',
          order: 2,
          isPublic: true,
          companyId: company.id
        },
        {
          question: 'Do you offer warranty?',
          answer: 'Yes! All our products come with manufacturer warranty. Most items have a 1-year warranty covering manufacturing defects.',
          category: 'General',
          order: 3,
          isPublic: true,
          companyId: company.id
        },
        {
          question: 'What is your shipping time?',
          answer: 'Standard shipping takes 3-5 business days. Express shipping (1-2 days) is available for an additional fee. We process orders within 24 hours on business days.',
          category: 'Shipping',
          order: 4,
          isPublic: true,
          companyId: company.id
        }
      ]
    })
    
    console.log('🎉 Database seeded successfully!')
    console.log('\n📊 Summary:')
    console.log(`- Company: ${company.name} (slug: ${company.slug})`)
    console.log(`- Admin Email: ${adminUser.email}`)
    console.log(`- Admin Password: admin123`)
    console.log(`- Products: ${iemProducts.length}`)
    console.log(`- Categories: ${categories.length}`)
    console.log(`- Location: ${location.name}`)
    console.log('\n🌐 Your website should now be accessible at: /next-x')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the seed if this script is executed directly
if (require.main === module) {
  seedNextXWithIEMs()
    .then(() => {
      console.log('\n✨ Seed operation completed!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Seed failed:', error)
      process.exit(1)
    })
}

export { seedNextXWithIEMs }
