import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { isPublic, isVerified } = body

    const updateData: any = {}
    if (typeof isPublic === "boolean") {
      updateData.isPublic = isPublic
    }
    if (typeof isVerified === "boolean") {
      updateData.isVerified = isVerified
    }

    const review = await prisma.review.update({
      where: { id },
      data: updateData,
      include: {
        item: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    })

    return NextResponse.json({ review })
  } catch (error) {
    console.error("Error updating review:", error)
    return NextResponse.json(
      { error: "Failed to update review" },
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

    await prisma.review.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting review:", error)
    return NextResponse.json(
      { error: "Failed to delete review" },
      { status: 500 }
    )
  }
}
