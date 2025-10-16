import { prisma } from '../lib/db';

async function main() {
  const searchName = 'Bijoux Ayu';
  
  console.log(`🔍 Searching for companies matching: "${searchName}"\n`);
  
  // Check for exact match (case-sensitive)
  const exactMatch = await prisma.company.findFirst({
    where: { name: searchName }
  });
  
  if (exactMatch) {
    console.log('✓ Found exact match:');
    console.log(`  ID: ${exactMatch.id}`);
    console.log(`  Name: ${exactMatch.name}`);
    console.log(`  Slug: ${exactMatch.slug}`);
    console.log();
  }
  
  // Check for case-insensitive match
  const allCompanies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true }
  });
  
  const similarCompanies = allCompanies.filter(c => 
    c.name.toLowerCase() === searchName.toLowerCase()
  );
  
  if (similarCompanies.length > 0) {
    console.log('✓ Found case-insensitive matches:');
    similarCompanies.forEach(c => {
      console.log(`  ID: ${c.id}`);
      console.log(`  Name: "${c.name}"`);
      console.log(`  Slug: ${c.slug}`);
      console.log();
    });
  }
  
  // Generate the slug that would be created
  const expectedSlug = searchName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  
  console.log(`Expected slug: "${expectedSlug}"\n`);
  
  // Check for slug collision
  const slugMatch = await prisma.company.findFirst({
    where: { slug: expectedSlug }
  });
  
  if (slugMatch) {
    console.log('⚠️  Found company with matching slug:');
    console.log(`  ID: ${slugMatch.id}`);
    console.log(`  Name: "${slugMatch.name}"`);
    console.log(`  Slug: ${slugMatch.slug}`);
    console.log();
  }
  
  // List all companies for reference
  console.log('All companies in database:');
  allCompanies.forEach(c => {
    console.log(`  - "${c.name}" (slug: ${c.slug})`);
  });
  
  if (!exactMatch && similarCompanies.length === 0 && !slugMatch) {
    console.log('\n✅ No conflicts found. The company name is available.');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
