import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// CORS headers for public API
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

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
      return NextResponse.json(
        { error: 'companySlug is required' }, 
        { status: 400, headers: corsHeaders }
      );
    }

    // Get company
    const company = await prisma.company.findFirst({
      where: { slug: companySlug, isPublic: true },
      select: { id: true }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' }, 
        { status: 404, headers: corsHeaders }
      );
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
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
