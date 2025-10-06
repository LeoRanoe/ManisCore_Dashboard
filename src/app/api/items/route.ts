import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema, ItemQuerySchema } from '@/lib/validations'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validation = ItemQuerySchema.safeParse(queryParams)
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validation.error.issues }, { status: 400 })
    }

    const { page, limit, sortBy, order, status, searchQuery } = validation.data

    // Build where clause
    const where: any = {}
    
    if (status) {
      where.status = status
    }
    
    if (searchQuery) {
      where.name = {
        contains: searchQuery,
        mode: 'insensitive',
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch items with companies
    const [items, totalCount] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          company: true,
        },
        orderBy: {
          [sortBy]: order,
        },
        skip,
        take: limit,
      }),
      prisma.item.count({ where }),
    ])

    // Calculate additional fields for each item
    const itemsWithCalculations = items.map(item => {
      const totalCostPerUnitUSD = item.costPerUnitUSD + item.freightPerUnitUSD
      const usdToSrdRate = 3.75 // Approximate exchange rate
      const totalCostPerUnitSRD = totalCostPerUnitUSD * usdToSrdRate
      const profitPerUnitSRD = item.sellingPriceSRD - totalCostPerUnitSRD
      const totalProfitSRD = profitPerUnitSRD * item.quantityInStock

      return {
        ...item,
        totalCostPerUnitUSD,
        profitPerUnitSRD: Number(profitPerUnitSRD.toFixed(2)),
        totalProfitSRD: Number(totalProfitSRD.toFixed(2)),
      }
    })

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      items: itemsWithCalculations,
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
    console.error('Error fetching items:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = ItemFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid item data', details: validation.error.issues }, { status: 400 })
    }

    const item = await prisma.item.create({
      data: validation.data,
      include: {
        company: true,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}