import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// GET /api/public/reviews?companySlug=xxx&itemSlug=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const companySlug = searchParams.get('companySlug');
    const itemSlug = searchParams.get('itemSlug');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

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

    // Filter by item if provided
    if (itemSlug) {
      const item = await prisma.item.findFirst({
        where: { slug: itemSlug, companyId: company.id },
        select: { id: true }
      });
      
      if (item) {
        where.itemId = item.id;
      } else {
        return NextResponse.json(
          { data: [], pagination: { page, limit, total: 0, totalPages: 0 } },
          { headers: corsHeaders }
        );
      }
    }

    const [total, reviews] = await Promise.all([
      prisma.review.count({ where }),
      prisma.review.findMany({
        where,
        select: {
          id: true,
          rating: true,
          title: true,
          comment: true,
          reviewerName: true,
          isVerified: true,
          createdAt: true,
          item: {
            select: {
              slug: true,
              name: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      })
    ]);

    // Calculate average rating if itemSlug provided
    let averageRating = null;
    if (itemSlug && reviews.length > 0) {
      const avgResult = await prisma.review.aggregate({
        where,
        _avg: {
          rating: true
        }
      });
      averageRating = avgResult._avg.rating;
    }

    return NextResponse.json({
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      averageRating
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/public/reviews - Submit a review
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { itemSlug, companySlug, rating, title, comment, reviewerName, reviewerEmail } = body;

    if (!itemSlug || !companySlug || !rating || !reviewerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
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

    // Get item
    const item = await prisma.item.findFirst({
      where: { slug: itemSlug, companyId: company.id },
      select: { id: true }
    });

    if (!item) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    // Create review (will be pending approval by default)
    const review = await prisma.review.create({
      data: {
        rating,
        title,
        comment,
        reviewerName,
        reviewerEmail,
        isPublic: false, // Requires approval
        isVerified: false,
        itemId: item.id,
        companyId: company.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your review! It will be published after moderation.',
      review: {
        id: review.id,
        rating: review.rating
      }
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error submitting review:', error);
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500, headers: corsHeaders }
    );
  }
}
