import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyFormSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await prisma.company.findUnique({
      where: {
        id: params.id,
      },
      include: {
        items: true,
        users: true,
        locations: true,
        expenses: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error fetching company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = CompanyFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid company data', details: validation.error.issues }, { status: 400 })
    }

    const company = await prisma.company.update({
      where: {
        id: params.id,
      },
      data: validation.data,
    })

    return NextResponse.json(company)
  } catch (error) {
    console.error('Error updating company:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Company name already exists' }, { status: 409 })
    }
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check if company exists
    const existingCompany = await prisma.company.findUnique({
      where: {
        id: params.id,
      },
      include: {
        _count: {
          select: {
            items: true,
            users: true,
            locations: true,
            expenses: true,
          },
        },
      },
    })

    if (!existingCompany) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Check if company has related data
    const hasRelatedData = 
      existingCompany._count.items > 0 ||
      existingCompany._count.users > 0 ||
      existingCompany._count.locations > 0 ||
      existingCompany._count.expenses > 0

    if (hasRelatedData) {
      return NextResponse.json(
        { 
          error: 'Cannot delete company with existing items, users, locations, or expenses. Please remove all related data first.' 
        }, 
        { status: 409 }
      )
    }

    // Delete the company
    await prisma.company.delete({
      where: {
        id: params.id,
      },
    })

    return NextResponse.json({ message: 'Company deleted successfully' })
  } catch (error) {
    console.error('Error deleting company:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}