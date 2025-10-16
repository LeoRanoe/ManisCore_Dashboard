import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { LocationFormSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const location = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error fetching location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = LocationFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid location data', details: validation.error.issues }, { status: 400 })
    }

    const location = await prisma.location.update({
      where: { id: params.id },
      data: validation.data,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            items: true,
          },
        },
      },
    })

    return NextResponse.json(location)
  } catch (error) {
    console.error('Error updating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if location exists and has dependencies
    const location = await prisma.location.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            items: true,
            stockBatches: true,
          }
        }
      }
    })

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Check if location has items or batches assigned
    const hasItems = location._count.items > 0
    const hasBatches = location._count.stockBatches > 0

    if (hasItems || hasBatches) {
      return NextResponse.json({ 
        error: 'Cannot delete location with assigned items or batches',
        message: `This location has ${location._count.items} items and ${location._count.stockBatches} batches assigned. Please reassign or remove them first.`,
        details: {
          items: location._count.items,
          batches: location._count.stockBatches
        }
      }, { status: 400 })
    }

    // Safe to delete
    await prisma.location.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'Location deleted successfully' })
  } catch (error) {
    console.error('Error deleting location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}