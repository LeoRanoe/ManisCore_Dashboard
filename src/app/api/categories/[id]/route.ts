import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: body.name,
        slug: body.slug,
        description: body.description || null,
        parentId: body.parentId || null,
        metaTitle: body.metaTitle || null,
        metaDescription: body.metaDescription || null,
        order: body.order,
      },
      include: {
        _count: {
          select: { items: true },
        },
      },
    })

    return NextResponse.json({ category })
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if category exists and has dependencies
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            items: true,
            children: true,
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      )
    }

    // Check if category has items or subcategories
    const hasItems = category._count.items > 0
    const hasChildren = category._count.children > 0

    if (hasItems || hasChildren) {
      return NextResponse.json(
        { 
          error: "Cannot delete category with items or subcategories",
          message: `This category has ${category._count.items} items and ${category._count.children} subcategories. Please reassign or remove them first.`,
          details: {
            items: category._count.items,
            subcategories: category._count.children
          }
        },
        { status: 400 }
      )
    }

    // Safe to delete
    await prisma.category.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    )
  }
}
