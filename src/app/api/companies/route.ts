import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyFormSchema } from '@/lib/validations'

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc',
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

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = CompanyFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid company data', details: validation.error.issues }, { status: 400 })
    }

    const company = await prisma.company.create({
      data: validation.data,
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Company name already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}