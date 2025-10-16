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

    const banners = await prisma.banner.findMany({
      where: whereClause,
      orderBy: [
        { order: "asc" },
        { createdAt: "desc" },
      ],
    })

    return NextResponse.json({ banners })
  } catch (error) {
    console.error("Error fetching banners:", error)
    return NextResponse.json(
      { error: "Failed to fetch banners" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      title,
      description,
      imageUrl,
      linkUrl,
      position,
      startDate,
      endDate,
      isActive,
      order,
      companyId,
    } = body

    if (!title || !imageUrl || !position || !companyId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const banner = await prisma.banner.create({
      data: {
        title,
        description: description || null,
        imageUrl,
        linkUrl: linkUrl || null,
        position,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive ?? true,
        order: order || 0,
        companyId,
      },
    })

    return NextResponse.json({ banner }, { status: 201 })
  } catch (error) {
    console.error("Error creating banner:", error)
    return NextResponse.json(
      { error: "Failed to create banner" },
      { status: 500 }
    )
  }
}
