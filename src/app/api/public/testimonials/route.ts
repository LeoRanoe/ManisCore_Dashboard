import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/public/testimonials?companySlug=xxx&featured=true
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companySlug = searchParams.get('companySlug');
    const featured = searchParams.get('featured') === 'true';

    if (!companySlug) {
      return NextResponse.json(
        { error: 'companySlug is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Get company
    const company = await prisma.company.findFirst({
      where: { slug: companySlug },
      select: { id: true }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    const where: any = {
      companyId: company.id,
      isPublic: true
    };

    if (featured) {
      where.isFeatured = true;
    }

    const testimonials = await prisma.testimonial.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        content: true,
        imageUrl: true,
        rating: true,
        isFeatured: true,
        order: true
      },
      orderBy: [
        { isFeatured: 'desc' },
        { order: 'asc' }
      ]
    });

    return NextResponse.json({ data: testimonials }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return NextResponse.json(
      { error: 'Failed to fetch testimonials' },
      { status: 500, headers: corsHeaders }
    );
  }
}
