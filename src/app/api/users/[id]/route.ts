import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UserFormSchema } from '@/lib/validations'
import { hash } from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: params.id },
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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = UserFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid user data', details: validation.error.issues }, { status: 400 })
    }

    // Prepare update data
    const updateData: any = { ...validation.data }
    
    // If password is provided, hash it; otherwise, remove it from update
    if (validation.data.password) {
      updateData.password = await hash(validation.data.password, 10)
    } else {
      delete updateData.password
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
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

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // First, check if this is the admin user
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { email: true, role: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Protect admin user from deletion
    if (user.email === 'admin@maniscor.com') {
      return NextResponse.json({ 
        error: 'Cannot delete system administrator. This user is protected.' 
      }, { status: 403 })
    }

    await (prisma as any).user.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}