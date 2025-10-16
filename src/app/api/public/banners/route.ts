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

// GET /api/public/banners?companySlug=xxx&position=hero
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companySlug = searchParams.get('companySlug');
    const position = searchParams.get('position');

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

    const now = new Date();
    const where: any = {
      companyId: company.id,
      isActive: true,
      OR: [
        { startDate: null, endDate: null },
        { startDate: { lte: now }, endDate: null },
        { startDate: null, endDate: { gte: now } },
        { startDate: { lte: now }, endDate: { gte: now } }
      ]
    };

    if (position) {
      where.position = position;
    }

    const banners = await prisma.banner.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        imageUrl: true,
        linkUrl: true,
        linkText: true,
        position: true,
        order: true
      },
      orderBy: { order: 'asc' }
    });

    return NextResponse.json({ data: banners }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching banners:', error);
    return NextResponse.json(
      { error: 'Failed to fetch banners' },
      { status: 500, headers: corsHeaders }
    );
  }
}
