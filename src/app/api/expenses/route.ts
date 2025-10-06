import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ExpenseFormSchema, ExpenseQuerySchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validation = ExpenseQuerySchema.safeParse(queryParams)
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validation.error.issues }, { status: 400 })
    }

    const { page, limit, sortBy, order, category, currency, searchQuery, companyId, createdById, dateFrom, dateTo } = validation.data

    // Build where clause
    const where: any = {}
    
    if (category) {
      where.category = category
    }
    
    if (currency) {
      where.currency = currency
    }
    
    if (searchQuery) {
      where.OR = [
        {
          description: {
            contains: searchQuery,
            mode: 'insensitive',
          }
        },
        {
          notes: {
            contains: searchQuery,
            mode: 'insensitive',
          }
        }
      ]
    }
    
    if (companyId) {
      where.companyId = companyId
    }
    
    if (createdById) {
      where.createdById = createdById
    }
    
    if (dateFrom) {
      where.date = { ...where.date, gte: new Date(dateFrom) }
    }
    
    if (dateTo) {
      where.date = { ...where.date, lte: new Date(dateTo) }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch expenses with related data
    const [expenses, totalCount] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          [sortBy]: order,
        },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      expenses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = ExpenseFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid expense data', details: validation.error.issues }, { status: 400 })
    }

    const data = validation.data
    
    // Convert date string to Date object if provided
    const expenseData = {
      ...data,
      date: data.date ? new Date(data.date) : new Date(),
    }

    // Create the expense
    const expense = await (prisma as any).expense.create({
      data: expenseData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update company cash balance based on currency
    const company = await (prisma as any).company.findUnique({
      where: { id: data.companyId },
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
      },
    })

    if (company) {
      const updateData: any = {}
      
      if (data.currency === 'SRD') {
        updateData.cashBalanceSRD = company.cashBalanceSRD - data.amount
      } else if (data.currency === 'USD') {
        updateData.cashBalanceUSD = company.cashBalanceUSD - data.amount
      }

      await prisma.company.update({
        where: { id: data.companyId },
        data: updateData,
      })
    }

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}