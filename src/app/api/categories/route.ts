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

    const categories = await prisma.category.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { items: true },
        },
      },
      orderBy: [
        { order: "asc" },
        { name: "asc" },
      ],
    })

    return NextResponse.json({ categories })
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      name,
      slug,
      description,
      parentId,
      metaTitle,
      metaDescription,
      order,
      companyId,
    } = body

    if (!name || !slug || !companyId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        parentId: parentId || null,
        metaTitle: metaTitle || null,
        metaDescription: metaDescription || null,
        order: order || 0,
        companyId,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })

    return NextResponse.json({ category }, { status: 201 })
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    )
  }
}
