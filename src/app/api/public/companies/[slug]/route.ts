import { NextResponse } from 'next/server';
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
      return NextResponse.json(
        { error: 'Company not found' }, 
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json(company, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching company:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company' }, 
      { status: 500, headers: corsHeaders }
    );
  }
}
