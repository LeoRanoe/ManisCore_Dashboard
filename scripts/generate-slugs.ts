import { prisma } from '../lib/db';

function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function main() {
  console.log('🔄 Generating slugs...\n');

  // Generate company slugs
  const companies = await prisma.company.findMany({
    where: { slug: null }
  });

  for (const company of companies) {
    const slug = generateSlug(company.name);
    await prisma.company.update({
      where: { id: company.id },
      data: { slug, isPublic: true }
    });
    console.log(`✓ Company: ${company.name} -> ${slug}`);
  }

  // Generate item slugs
  const items = await prisma.item.findMany({
    where: { slug: null },
    include: { company: true }
  });

  for (const item of items) {
    const companySlug = item.company.slug || generateSlug(item.company.name);
    const slug = generateSlug(`${companySlug}-${item.name}`);
    await prisma.item.update({
      where: { id: item.id },
      data: { slug, isPublic: true }
    });
    console.log(`✓ Item: ${item.name} -> ${slug}`);
  }

  console.log(`\n✅ Done! Generated ${companies.length} company slugs and ${items.length} item slugs.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
