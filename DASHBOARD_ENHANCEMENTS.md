# 🔧 Dashboard Enhancements for E-Commerce Support

This document contains all the changes needed to the dashboard to support the e-commerce platform.

---

## 📋 Overview

Add these fields to support multi-company e-commerce:
- Company: slug, description, logo, banner, contact info, social media, theme config, visibility
- Items: slug, description, YouTube reviews, specifications, tags, featured status, SEO fields

**⚠️ Important**: All changes are **non-destructive** - no existing data will be lost!

---

## Step 1: Update Database Schema (5 minutes)

### Update `prisma/schema.prisma`

Add these fields to the **Company** model:

```prisma
model Company {
  id             String     @id @default(cuid())
  name           String     @unique
  
  // NEW FIELDS - Add these lines
  slug           String?    @unique
  description    String?
  logoUrl        String?
  bannerUrl      String?
  contactEmail   String?
  contactPhone   String?
  socialMedia    Json?
  themeConfig    Json?
  isPublic       Boolean    @default(true)
  
  // Keep all existing fields below
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  cashBalanceSRD Float      @default(0)
  // ... rest of existing fields
}
```

Add these fields to the **Item** model:

```prisma
model Item {
  id                  String       @id @default(cuid())
  name                String
  
  // NEW FIELDS - Add these lines
  slug                String?
  description         String?
  shortDescription    String?
  youtubeReviewUrls   String[]     @default([])
  specifications      Json?
  tags                String[]     @default([])
  isFeatured          Boolean      @default(false)
  isPublic            Boolean      @default(true)
  seoTitle            String?
  seoDescription      String?
  
  // Keep all existing fields below
  status              Status?      @default(ToOrder)
  quantityInStock     Int?         @default(0)
  // ... rest of existing fields
}
```

### Run Migration

```bash
# Create migration
npx prisma migrate dev --name add_ecommerce_fields

# Generate Prisma client
npx prisma generate
```

---

## Step 2: Generate Slugs for Existing Data (2 minutes)

Create `scripts/generate-slugs.ts`:

```typescript
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
```

Run it:
```bash
npx tsx scripts/generate-slugs.ts
```

---

## Step 3: Create Public API Routes (15 minutes)

### 3.1 Companies List API

Create `src/app/api/public/companies/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      where: { isPublic: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        contactEmail: true,
        contactPhone: true,
        socialMedia: true,
        themeConfig: true,
        _count: {
          select: { items: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json(companies);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
  }
}
```

### 3.2 Single Company API

Create `src/app/api/public/companies/[slug]/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const company = await prisma.company.findFirst({
      where: { slug: params.slug, isPublic: true },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        logoUrl: true,
        bannerUrl: true,
        contactEmail: true,
        contactPhone: true,
        socialMedia: true,
        themeConfig: true,
        _count: { select: { items: true } }
      }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    return NextResponse.json(company);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch company' }, { status: 500 });
  }
}
```

### 3.3 Products List API

Create `src/app/api/public/products/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companySlug = searchParams.get('companySlug');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search');
    const tags = searchParams.get('tags')?.split(',');
    const isFeatured = searchParams.get('isFeatured') === 'true';

    if (!companySlug) {
      return NextResponse.json({ error: 'companySlug is required' }, { status: 400 });
    }

    // Get company
    const company = await prisma.company.findFirst({
      where: { slug: companySlug, isPublic: true },
      select: { id: true }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Build where clause
    const where: any = {
      companyId: company.id,
      isPublic: true
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (tags?.length) {
      where.tags = { hasSome: tags };
    }

    if (isFeatured) {
      where.isFeatured = true;
    }

    // Get total and products
    const [total, products] = await Promise.all([
      prisma.item.count({ where }),
      prisma.item.findMany({
        where,
        select: {
          id: true,
          slug: true,
          name: true,
          shortDescription: true,
          imageUrls: true,
          tags: true,
          isFeatured: true,
          sellingPriceSRD: true,
          status: true,
          quantityInStock: true
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 });
  }
}
```

### 3.4 Single Product API

Create `src/app/api/public/products/[slug]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { searchParams } = request.nextUrl;
    const companySlug = searchParams.get('companySlug');

    if (!companySlug) {
      return NextResponse.json({ error: 'companySlug is required' }, { status: 400 });
    }

    const company = await prisma.company.findFirst({
      where: { slug: companySlug, isPublic: true },
      select: { id: true }
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const product = await prisma.item.findFirst({
      where: {
        slug: params.slug,
        companyId: company.id,
        isPublic: true
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        shortDescription: true,
        imageUrls: true,
        youtubeReviewUrls: true,
        specifications: true,
        tags: true,
        isFeatured: true,
        sellingPriceSRD: true,
        status: true,
        quantityInStock: true,
        seoTitle: true,
        seoDescription: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    // Get related products
    const relatedProducts = await prisma.item.findMany({
      where: {
        companyId: company.id,
        isPublic: true,
        id: { not: product.id },
        tags: { hasSome: product.tags }
      },
      select: {
        id: true,
        slug: true,
        name: true,
        shortDescription: true,
        imageUrls: true,
        sellingPriceSRD: true
      },
      take: 4
    });

    return NextResponse.json({ ...product, relatedProducts });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
```

---

## Step 4: Update Dashboard Forms (30 minutes)

### 4.1 Update Company Form

Update `components/companies/company-form-dialog.tsx`:

Add these form fields:

```typescript
// Add to your form schema and form fields:

// Basic Info
<div className="space-y-2">
  <Label>Company Slug (URL)</Label>
  <Input {...register('slug')} placeholder="nextx" />
  <p className="text-xs text-muted-foreground">
    Used in URLs: /nextx
  </p>
</div>

<div className="space-y-2">
  <Label>Description</Label>
  <Textarea {...register('description')} rows={3} />
</div>

// Images
<div className="space-y-2">
  <Label>Logo URL</Label>
  <Input {...register('logoUrl')} placeholder="https://..." />
</div>

<div className="space-y-2">
  <Label>Banner URL</Label>
  <Input {...register('bannerUrl')} placeholder="https://..." />
</div>

// Contact Info
<div className="space-y-2">
  <Label>Contact Email</Label>
  <Input {...register('contactEmail')} type="email" />
</div>

<div className="space-y-2">
  <Label>WhatsApp Number</Label>
  <Input {...register('contactPhone')} placeholder="5978888888" />
</div>

// Social Media (JSON field)
<div className="space-y-2">
  <Label>Instagram Username</Label>
  <Input {...register('socialMedia.instagram')} placeholder="@nextx.sr" />
</div>

<div className="space-y-2">
  <Label>Facebook URL</Label>
  <Input {...register('socialMedia.facebook')} />
</div>

<div className="space-y-2">
  <Label>TikTok Username</Label>
  <Input {...register('socialMedia.tiktok')} placeholder="@nextx.sr" />
</div>

// Visibility
<div className="flex items-center space-x-2">
  <input type="checkbox" {...register('isPublic')} />
  <Label>Show in E-Commerce</Label>
</div>
```

### 4.2 Update Item Form

Update `components/inventory/item-form-dialog.tsx`:

Add these form fields:

```typescript
// Add to your form fields:

// Slug (auto-generate from name)
<div className="space-y-2">
  <Label>Product Slug</Label>
  <Input {...register('slug')} placeholder="iphone-15-pro" />
  <p className="text-xs text-muted-foreground">Auto-generated from name</p>
</div>

// Description
<div className="space-y-2">
  <Label>Full Description</Label>
  <Textarea {...register('description')} rows={5} />
</div>

<div className="space-y-2">
  <Label>Short Description (Catalog)</Label>
  <Input {...register('shortDescription')} maxLength={500} />
</div>

// YouTube Reviews
<div className="space-y-2">
  <Label>YouTube Review URLs (one per line)</Label>
  <Textarea 
    {...register('youtubeReviewUrls')} 
    rows={3}
    placeholder="https://youtube.com/watch?v=..."
  />
</div>

// Specifications (JSON)
<div className="space-y-2">
  <Label>Specifications (JSON format)</Label>
  <Textarea 
    {...register('specifications')}
    rows={4}
    placeholder={`{
  "Screen": "6.7-inch",
  "Processor": "A17 Pro",
  "Storage": "256GB"
}`}
  />
</div>

// Tags
<div className="space-y-2">
  <Label>Tags (comma-separated)</Label>
  <Input 
    {...register('tags')} 
    placeholder="smartphone, apple, 5g"
  />
</div>

// Featured & Public
<div className="flex items-center space-x-2">
  <input type="checkbox" {...register('isFeatured')} />
  <Label>Featured Product</Label>
</div>

<div className="flex items-center space-x-2">
  <input type="checkbox" {...register('isPublic')} />
  <Label>Show in E-Commerce</Label>
</div>

// SEO
<div className="space-y-2">
  <Label>SEO Title</Label>
  <Input {...register('seoTitle')} />
</div>

<div className="space-y-2">
  <Label>SEO Description</Label>
  <Textarea {...register('seoDescription')} rows={2} />
</div>
```

---

## Step 5: Update Validations (5 minutes)

Update `lib/validations.ts`:

```typescript
// Add to CompanyFormSchema:
export const CompanyFormSchema = z.object({
  name: z.string().min(1),
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  logoUrl: z.string().url().optional().nullable(),
  bannerUrl: z.string().url().optional().nullable(),
  contactEmail: z.string().email().optional().nullable(),
  contactPhone: z.string().optional().nullable(),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    tiktok: z.string().optional(),
  }).optional(),
  themeConfig: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    accentColor: z.string().optional(),
  }).optional(),
  isPublic: z.boolean().default(true),
});

// Add to ItemFormSchema:
export const ItemFormSchema = z.object({
  // ... existing fields
  slug: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  shortDescription: z.string().max(500).optional().nullable(),
  youtubeReviewUrls: z.array(z.string().url()).optional().default([]),
  specifications: z.record(z.string()).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  isFeatured: z.boolean().default(false),
  isPublic: z.boolean().default(true),
  seoTitle: z.string().optional().nullable(),
  seoDescription: z.string().optional().nullable(),
});
```

---

## Step 6: Test Everything (10 minutes)

### Test Checklist:

- [ ] Create/update a company with new fields
- [ ] Generate slug automatically
- [ ] Upload logo and banner
- [ ] Add contact info and social media
- [ ] Create/update an item with new fields
- [ ] Add YouTube review URLs
- [ ] Add specifications and tags
- [ ] Mark item as featured
- [ ] Test public APIs:
  ```bash
  # Test companies endpoint
  curl http://localhost:3000/api/public/companies
  
  # Test single company
  curl http://localhost:3000/api/public/companies/nextx
  
  # Test products
  curl http://localhost:3000/api/public/products?companySlug=nextx
  
  # Test single product
  curl http://localhost:3000/api/public/products/nextx-iphone-15?companySlug=nextx
  ```

---

## ✅ Done!

Your dashboard now supports the e-commerce platform with:
- ✅ Company profiles with branding
- ✅ Product catalogs with rich data
- ✅ YouTube video support
- ✅ Public APIs for e-commerce
- ✅ SEO fields
- ✅ Tags and specifications

**Time to complete**: ~1 hour  
**Next step**: Build the e-commerce platform using these APIs!
