import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const testimonial = await prisma.testimonial.update({
      where: { id },
      data: {
        name: body.name || body.customerName,
        role: body.role || body.customerRole || null,
        content: body.content,
        rating: body.rating,
        imageUrl: body.imageUrl || null,
        isFeatured: body.isFeatured,
        isPublic: body.isPublic,
        order: body.order,
      },
    })

    return NextResponse.json({ testimonial })
  } catch (error) {
    console.error("Error updating testimonial:", error)
    return NextResponse.json(
      { error: "Failed to update testimonial" },
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

    await prisma.testimonial.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting testimonial:", error)
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500 }
    )
  }
}
