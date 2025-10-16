import { prisma } from '../lib/db';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🔧 Fixing companies with empty slugs...\n');

  // Find all companies with empty or null slugs
  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { slug: null },
        { slug: '' }
      ]
    }
  });

  console.log(`Found ${companies.length} companies with missing slugs\n`);

  for (const company of companies) {
    const newSlug = generateSlug(company.name);
    
    try {
      await prisma.company.update({
        where: { id: company.id },
        data: { slug: newSlug }
      });
      console.log(`✓ Updated "${company.name}" -> slug: "${newSlug}"`);
    } catch (error) {
      console.error(`✗ Failed to update "${company.name}":`, error);
    }
  }

  console.log('\n✅ Done!');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
