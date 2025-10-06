import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    const validation = ItemFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid item data', details: validation.error.issues }, { status: 400 })
    }

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const updatedItem = await prisma.item.update({
      where: { id },
      data: validation.data,
      include: {
        company: true,
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await prisma.item.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}