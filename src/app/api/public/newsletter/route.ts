import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

// POST /api/public/newsletter/subscribe
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, companySlug, source } = body;

    if (!email || !companySlug) {
      return NextResponse.json(
        { error: 'Email and company are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
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

    // Check if already subscribed
    const existing = await prisma.newsletterSubscriber.findUnique({
      where: {
        email_companyId: {
          email,
          companyId: company.id
        }
      }
    });

    if (existing) {
      if (existing.isActive) {
        return NextResponse.json(
          { message: 'You are already subscribed!' },
          { status: 200, headers: corsHeaders }
        );
      } else {
        // Reactivate subscription
        await prisma.newsletterSubscriber.update({
          where: { id: existing.id },
          data: { isActive: true, name }
        });
        return NextResponse.json(
          { success: true, message: 'Your subscription has been reactivated!' },
          { headers: corsHeaders }
        );
      }
    }

    // Create new subscriber
    await prisma.newsletterSubscriber.create({
      data: {
        email,
        name,
        source: source || 'website',
        companyId: company.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for subscribing!'
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error('Error subscribing to newsletter:', error);
    return NextResponse.json(
      { error: 'Failed to subscribe' },
      { status: 500, headers: corsHeaders }
    );
  }
}
