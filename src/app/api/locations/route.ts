import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { LocationFormSchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const companyId = searchParams.get('companyId')
    const isActive = searchParams.get('isActive')

    const where: any = {}
    
    if (companyId) {
      where.companyId = companyId
    }
    
    if (isActive !== null) {
      where.isActive = isActive === 'true'
    }

    const locations = await prisma.location.findMany({
      where,
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
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ locations })
  } catch (error) {
    console.error('Error fetching locations:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = LocationFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid location data', details: validation.error.issues }, { status: 400 })
    }

    const location = await prisma.location.create({
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

    return NextResponse.json(location, { status: 201 })
  } catch (error) {
    console.error('Error creating location:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}