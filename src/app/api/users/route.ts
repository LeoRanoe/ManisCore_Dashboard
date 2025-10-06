import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UserFormSchema } from '@/lib/validations'

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

    const users = await prisma.user.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
            locations: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = UserFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid user data', details: validation.error.issues }, { status: 400 })
    }

    const user = await prisma.user.create({
      data: validation.data,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            items: true,
            locations: true,
          },
        },
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}