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

// GET /api/public/faqs?companySlug=xxx&category=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companySlug = searchParams.get('companySlug');
    const category = searchParams.get('category');

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

    if (category) {
      where.category = category;
    }

    const faqs = await prisma.fAQ.findMany({
      where,
      select: {
        id: true,
        question: true,
        answer: true,
        category: true,
        order: true
      },
      orderBy: { order: 'asc' }
    });

    // Group by category
    const grouped = faqs.reduce((acc, faq) => {
      const cat = faq.category || 'General';
      if (!acc[cat]) {
        acc[cat] = [];
      }
      acc[cat].push(faq);
      return acc;
    }, {} as Record<string, typeof faqs>);

    return NextResponse.json({
      data: faqs,
      grouped
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching FAQs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch FAQs' },
      { status: 500, headers: corsHeaders }
    );
  }
}
