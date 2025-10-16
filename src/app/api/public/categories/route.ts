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

    // Get categories with item count
    const categories = await prisma.category.findMany({
      where: {
        companyId: company.id,
        isPublic: true
      },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        imageUrl: true,
        parentId: true,
        order: true,
        _count: {
          select: {
            items: {
              where: {
                isPublic: true
              }
            }
          }
        }
      },
      orderBy: { order: 'asc' }
    });

    // Transform to include item count
    const categoriesWithCount = categories.map(cat => ({
      ...cat,
      itemCount: cat._count.items,
      _count: undefined
    }));

    return NextResponse.json({
      data: categoriesWithCount
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
