import { prisma } from '../lib/db';

async function main() {
  console.log('🌱 Adding ecommerce sample data...\n');

  // Get both companies
  const maniscor = await prisma.company.findFirst({
    where: { slug: 'maniscor' }
  });

  const bijouxayu = await prisma.company.findFirst({
    where: { slug: 'bijoux-ayu' }
  });

  if (!maniscor || !bijouxayu) {
    console.error('❌ Companies not found. Run seed first!');
    return;
  }

  // Update ManiscOr settings
  await prisma.company.update({
    where: { id: maniscor.id },
    data: {
      heroTitle: 'Premium Electronics & Gadgets',
      heroSubtitle: 'Your trusted source for quality electronics in Suriname',
      whatsappGreeting: 'Hi! I am interested in your products. Can you provide more information?',
      businessHours: {
        monday: '9:00 AM - 6:00 PM',
        tuesday: '9:00 AM - 6:00 PM',
        wednesday: '9:00 AM - 6:00 PM',
        thursday: '9:00 AM - 6:00 PM',
        friday: '9:00 AM - 6:00 PM',
        saturday: '10:00 AM - 4:00 PM',
        sunday: 'Closed'
      },
      aboutUs: 'ManiscOr is Suriname\'s premier destination for electronics and technology products. With years of experience, we pride ourselves on offering authentic products, exceptional customer service, and competitive prices.',
      shippingPolicy: 'We offer delivery throughout Suriname. Delivery time is typically 1-3 business days. Delivery fees vary based on location. Contact us via WhatsApp for exact pricing.',
      returnPolicy: 'We accept returns within 30 days of purchase for unopened items in original condition. Electronics must be unopened with all seals intact. Contact us to initiate a return.',
      warrantyInfo: 'All products come with manufacturer warranty. Warranty duration varies by product (typically 6-24 months). Keep your receipt for warranty claims.',
      metaDescription: 'Shop premium electronics and gadgets at ManiscOr. Authentic products, competitive prices, and excellent service in Suriname.',
      metaKeywords: ['electronics', 'gadgets', 'suriname', 'phones', 'computers', 'accessories']
    }
  });
  console.log('✅ Updated ManiscOr settings');

  // Add ManiscOr Testimonials
  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Business Owner',
      content: 'Excellent service and genuine products! I\'ve been buying from ManiscOr for years and never been disappointed.',
      rating: 5,
      isFeatured: true,
      order: 1
    },
    {
      name: 'Michael Chen',
      role: 'Tech Enthusiast',
      content: 'Best electronics store in Suriname! Great prices and very helpful staff.',
      rating: 5,
      isFeatured: true,
      order: 2
    },
    {
      name: 'Priya Patel',
      role: 'Happy Customer',
      content: 'Fast delivery and authentic products. Highly recommend ManiscOr!',
      rating: 5,
      isFeatured: true,
      order: 3
    }
  ];

  for (const t of testimonials) {
    await prisma.testimonial.create({
      data: { ...t, isPublic: true, companyId: maniscor.id }
    });
  }
  console.log(`✅ Added ${testimonials.length} testimonials for ManiscOr`);

  // Add ManiscOr FAQs
  const faqs = [
    {
      question: 'Do you offer delivery throughout Suriname?',
      answer: 'Yes! We deliver to all locations in Suriname. Delivery time is typically 1-3 business days depending on your location. Contact us via WhatsApp for exact delivery fees and estimated delivery time.',
      category: 'Shipping',
      order: 1
    },
    {
      question: 'Are all your products authentic?',
      answer: 'Absolutely! We guarantee 100% authentic products. All items come with original packaging and manufacturer warranty.',
      category: 'Products',
      order: 2
    },
    {
      question: 'What are your business hours?',
      answer: 'We are open Monday to Friday from 9:00 AM to 6:00 PM, and Saturday from 10:00 AM to 4:00 PM. We are closed on Sundays.',
      category: 'General',
      order: 3
    },
    {
      question: 'How can I place an order?',
      answer: 'Simply browse our products and contact us via WhatsApp with the product name or code. Our team will help you complete your order.',
      category: 'General',
      order: 4
    },
    {
      question: 'What is your return policy?',
      answer: 'We accept returns within 30 days of purchase for unopened items in original condition. Electronics must have all seals intact. Please contact us to initiate a return.',
      category: 'Returns',
      order: 5
    },
    {
      question: 'Do products come with warranty?',
      answer: 'Yes, all products come with manufacturer warranty. Warranty duration varies by product, typically ranging from 6 to 24 months. Keep your receipt for warranty claims.',
      category: 'Products',
      order: 6
    }
  ];

  for (const faq of faqs) {
    await prisma.fAQ.create({
      data: { ...faq, isPublic: true, companyId: maniscor.id }
    });
  }
  console.log(`✅ Added ${faqs.length} FAQs for ManiscOr`);

  // Update Bijoux Ayu settings
  await prisma.company.update({
    where: { id: bijouxayu.id },
    data: {
      heroTitle: 'Exquisite Jewelry & Accessories',
      heroSubtitle: 'Discover beautiful jewelry pieces that make you shine',
      whatsappGreeting: 'Hello! I\'m interested in your jewelry collection. Can you help me?',
      businessHours: {
        monday: '10:00 AM - 6:00 PM',
        tuesday: '10:00 AM - 6:00 PM',
        wednesday: '10:00 AM - 6:00 PM',
        thursday: '10:00 AM - 6:00 PM',
        friday: '10:00 AM - 7:00 PM',
        saturday: '10:00 AM - 7:00 PM',
        sunday: 'By Appointment'
      },
      aboutUs: 'Bijoux Ayu is your destination for beautiful, high-quality jewelry and accessories. We curate unique pieces that reflect your personal style and make every moment special.',
      shippingPolicy: 'We offer secure delivery for all jewelry pieces. Each item is carefully packaged to ensure safe transit. Delivery typically takes 1-2 business days.',
      returnPolicy: 'We accept returns within 14 days for unworn jewelry in original packaging. Custom pieces are non-returnable. Contact us for return authorization.',
      warrantyInfo: 'All jewelry comes with authenticity guarantee. Precious metals and gemstones are certified. We offer free cleaning and maintenance for all purchases.',
      metaDescription: 'Shop exquisite jewelry and accessories at Bijoux Ayu. Quality craftsmanship, unique designs, and exceptional service.',
      metaKeywords: ['jewelry', 'accessories', 'necklaces', 'rings', 'earrings', 'suriname']
    }
  });
  console.log('✅ Updated Bijoux Ayu settings');

  // Add Bijoux Ayu Testimonials
  const bijouxTestimonials = [
    {
      name: 'Emily Rodriguez',
      role: 'Bride-to-be',
      content: 'Found the perfect wedding jewelry at Bijoux Ayu! Beautiful pieces and amazing service.',
      rating: 5,
      isFeatured: true,
      order: 1
    },
    {
      name: 'Linda Williams',
      role: 'Fashion Designer',
      content: 'Unique and elegant pieces. Bijoux Ayu is my go-to for special occasion jewelry.',
      rating: 5,
      isFeatured: true,
      order: 2
    }
  ];

  for (const t of bijouxTestimonials) {
    await prisma.testimonial.create({
      data: { ...t, isPublic: true, companyId: bijouxayu.id }
    });
  }
  console.log(`✅ Added ${bijouxTestimonials.length} testimonials for Bijoux Ayu`);

  // Add Bijoux Ayu FAQs
  const bijouxFaqs = [
    {
      question: 'Do you offer custom jewelry design?',
      answer: 'Yes! We can create custom pieces tailored to your preferences. Contact us to discuss your vision.',
      category: 'Products',
      order: 1
    },
    {
      question: 'Is the jewelry genuine?',
      answer: 'Absolutely! All our jewelry is authentic with proper certification for precious metals and gemstones.',
      category: 'Products',
      order: 2
    },
    {
      question: 'Do you offer jewelry cleaning?',
      answer: 'Yes, we provide free cleaning and maintenance for all jewelry purchased from us.',
      category: 'General',
      order: 3
    },
    {
      question: 'Can I return jewelry?',
      answer: 'Yes, unworn jewelry in original packaging can be returned within 14 days. Custom pieces are non-returnable.',
      category: 'Returns',
      order: 4
    }
  ];

  for (const faq of bijouxFaqs) {
    await prisma.fAQ.create({
      data: { ...faq, isPublic: true, companyId: bijouxayu.id }
    });
  }
  console.log(`✅ Added ${bijouxFaqs.length} FAQs for Bijoux Ayu`);

  // Add a sample banner for ManiscOr
  await prisma.banner.create({
    data: {
      title: 'New Arrivals!',
      description: 'Check out our latest electronics and gadgets',
      position: 'hero',
      order: 1,
      isActive: true,
      companyId: maniscor.id
    }
  });
  console.log('✅ Added sample banner for ManiscOr');

  console.log('\n🎉 Ecommerce sample data added successfully!\n');
  console.log('📝 Summary:');
  console.log('   - Updated company settings for both companies');
  console.log('   - Added testimonials for both companies');
  console.log('   - Added FAQs for both companies');
  console.log('   - Added sample banner for ManiscOr');
  console.log('\n🌐 Visit your sites:');
  console.log('   - ManiscOr: http://localhost:3001/maniscor');
  console.log('   - Bijoux Ayu: http://localhost:3001/bijoux-ayu');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
