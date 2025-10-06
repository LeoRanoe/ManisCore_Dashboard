import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema, ItemQuerySchema } from '@/lib/validations'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const queryParams = Object.fromEntries(searchParams.entries())
    
    const validation = ItemQuerySchema.safeParse(queryParams)
    
    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid query parameters', details: validation.error.issues }, { status: 400 })
    }

    const { page, limit, sortBy, order, status, searchQuery, companyId, assignedUserId, locationId } = validation.data

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
    
    if (companyId) {
      where.companyId = companyId
    }
    
    if (assignedUserId) {
      where.assignedUserId = assignedUserId
    }
    
    if (locationId) {
      where.locationId = locationId
    }

    // Calculate pagination
    const skip = (page - 1) * limit

    // Fetch items with related data
    const [items, totalCount] = await Promise.all([
      prisma.item.findMany({
        where,
        include: {
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          location: {
            select: {
              id: true,
              name: true,
            },
          },
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
      // Freight cost is now total per order, so divide by quantity for per-unit cost
      const freightPerUnitUSD = item.quantityInStock > 0 ? item.freightCostUSD / item.quantityInStock : 0
      const totalCostPerUnitUSD = item.costPerUnitUSD + freightPerUnitUSD
      const usdToSrdRate = 3.75 // Approximate exchange rate
      const totalCostPerUnitSRD = totalCostPerUnitUSD * usdToSrdRate
      const profitPerUnitSRD = item.sellingPriceSRD - totalCostPerUnitSRD
      const totalProfitSRD = profitPerUnitSRD * item.quantityInStock

      return {
        ...item,
        totalCostPerUnitUSD: Number(totalCostPerUnitUSD.toFixed(2)),
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
    console.log('Received item creation request:', JSON.stringify(body, null, 2))
    
    const validation = ItemFormSchema.safeParse(body)

    if (!validation.success) {
      console.error('Validation failed:', validation.error.issues)
      return NextResponse.json({ error: 'Invalid item data', details: validation.error.issues }, { status: 400 })
    }

    const data = validation.data

    // Clean up the data - remove null/undefined optional fields
    const cleanedData: any = {
      name: data.name,
      status: data.status,
      quantityInStock: data.quantityInStock,
      costPerUnitUSD: data.costPerUnitUSD,
      freightCostUSD: data.freightCostUSD,
      sellingPriceSRD: data.sellingPriceSRD,
      companyId: data.companyId,
    }

    // Only add optional fields if they have values
    if (data.supplier) cleanedData.supplier = data.supplier
    if (data.supplierSku) cleanedData.supplierSku = data.supplierSku
    if (data.orderDate) cleanedData.orderDate = new Date(data.orderDate)
    if (data.expectedArrival) cleanedData.expectedArrival = new Date(data.expectedArrival)
    if (data.orderNumber) cleanedData.orderNumber = data.orderNumber
    if (data.profitMarginPercent !== null && data.profitMarginPercent !== undefined) cleanedData.profitMarginPercent = data.profitMarginPercent
    if (data.minStockLevel !== null && data.minStockLevel !== undefined) cleanedData.minStockLevel = data.minStockLevel
    if (data.notes) cleanedData.notes = data.notes
    if (data.assignedUserId) cleanedData.assignedUserId = data.assignedUserId
    if (data.locationId) cleanedData.locationId = data.locationId

    // Check if item is being ordered and we need to deduct cash
    if (data.status === 'Ordered') {
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
        select: {
          id: true,
          name: true,
          cashBalanceUSD: true,
        },
      })

      if (!company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      // Calculate total order cost (cost per unit + freight, multiplied by quantity)
      const totalOrderCostUSD = (data.costPerUnitUSD * data.quantityInStock) + data.freightCostUSD

      // Check if company has sufficient USD balance
      if (company.cashBalanceUSD < totalOrderCostUSD) {
        return NextResponse.json(
          { 
            error: 'Insufficient funds',
            message: `Company ${company.name} has insufficient USD balance. Required: $${totalOrderCostUSD.toFixed(2)}, Available: $${company.cashBalanceUSD.toFixed(2)}`,
            required: totalOrderCostUSD,
            available: company.cashBalanceUSD,
          },
          { status: 400 }
        )
      }

      // Deduct the cost from company's USD balance
      await prisma.company.update({
        where: { id: data.companyId },
        data: {
          cashBalanceUSD: company.cashBalanceUSD - totalOrderCostUSD,
        },
      })
    }

    console.log('Creating item with data:', JSON.stringify(cleanedData, null, 2))

    const item = await prisma.item.create({
      data: cleanedData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    console.log('Item created successfully:', item.id)
    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating item:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 })
  }
}