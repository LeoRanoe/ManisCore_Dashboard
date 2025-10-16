import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get("companyId")

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      )
    }

    // Handle "all" companies case
    const whereClause = companyId === "all" 
      ? {} 
      : { companyId }

    const testimonials = await prisma.testimonial.findMany({
      where: whereClause,
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({ testimonials })
  } catch (error) {
    console.error("Error fetching testimonials:", error)
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      customerName,
      customerRole,
      content,
      rating,
      imageUrl,
      isFeatured,
      isPublic,
      order,
      companyId,
    } = body

    if (!customerName || !content || !companyId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const testimonial = await prisma.testimonial.create({
      data: {
        name: customerName,
        role: customerRole || null,
        content,
        rating: rating || 5,
        imageUrl: imageUrl || null,
        isFeatured: isFeatured || false,
        isPublic: isPublic ?? false,
        order: order || 0,
        companyId,
      },
    })

    return NextResponse.json({ testimonial }, { status: 201 })
  } catch (error) {
    console.error("Error creating testimonial:", error)
    return NextResponse.json(
      { error: "Failed to create testimonial" },
      { status: 500 }
    )
  }
}
