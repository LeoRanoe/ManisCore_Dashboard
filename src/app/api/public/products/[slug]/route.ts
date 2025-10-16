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
    console.error('Error fetching product:', error);
    return NextResponse.json({ error: 'Failed to fetch product' }, { status: 500 });
  }
}
