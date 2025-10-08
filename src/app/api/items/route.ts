import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema, ItemQuerySchema } from '@/lib/validations'
import { syncItemQuantityFromBatches } from '@/lib/utils'

export const dynamic = 'force-dynamic'

// Helper function to aggregate batch data for items using batch system
async function aggregateBatchDataForItems(items: any[]) {
  const itemsUsingBatches = items.filter(item => item.useBatchSystem)
  
  if (itemsUsingBatches.length === 0) {
    return items
  }

  // Fetch all batches for items using batch system with location data
  const batches = await prisma.stockBatch.findMany({
    where: {
      itemId: {
        in: itemsUsingBatches.map(i => i.id)
      }
    },
    include: {
      location: {
        select: {
          id: true,
          name: true
        }
      }
    }
  })

  // Group batches by itemId and aggregate data
  const batchDataMap = new Map()
  
  batches.forEach(batch => {
    if (!batchDataMap.has(batch.itemId)) {
      batchDataMap.set(batch.itemId, {
        batchCount: 0,
        totalQuantity: 0,
        locations: new Set(),
        statuses: new Set(),
      })
    }
    
    const data = batchDataMap.get(batch.itemId)
    data.batchCount++
    data.totalQuantity += batch.quantity || 0
    if (batch.location) {
      data.locations.add(JSON.stringify({ id: batch.location.id, name: batch.location.name }))
    }
    data.statuses.add(batch.status)
  })

  // Merge batch data into items
  return items.map(item => {
    if (!item.useBatchSystem) {
      return item
    }

    const batchData = batchDataMap.get(item.id)
    if (!batchData) {
      return {
        ...item,
        quantityInStock: 0,
        batchCount: 0,
        locationCount: 0,
        batchLocations: [],
        hasMultipleLocations: false,
        hasMultipleStatuses: false,
      }
    }

    const locations = Array.from(batchData.locations).map(l => JSON.parse(l as string))
    const locationCount = locations.length

    return {
      ...item,
      quantityInStock: batchData.totalQuantity,
      batchCount: batchData.batchCount,
      locationCount: locationCount,
      batchLocations: locations,
      hasMultipleLocations: locationCount > 1,
      hasMultipleStatuses: batchData.statuses.size > 1,
      statuses: Array.from(batchData.statuses),
    }
  })
}

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

    // Aggregate batch data for items using batch system
    const itemsWithBatchData = await aggregateBatchDataForItems(items)

    // Calculate additional fields for each item
    const itemsWithCalculations = itemsWithBatchData.map(item => {
      const quantityInStock = item.quantityInStock || 0
      const freightCostUSD = item.freightCostUSD || 0
      // Freight cost is now total per order, so divide by quantity for per-unit cost
      const freightPerUnitUSD = quantityInStock > 0 ? freightCostUSD / quantityInStock : 0
      const totalCostPerUnitUSD = item.costPerUnitUSD + freightPerUnitUSD
      const usdToSrdRate = 40 // Approximate exchange rate
      const totalCostPerUnitSRD = totalCostPerUnitUSD * usdToSrdRate
      const profitPerUnitSRD = item.sellingPriceSRD - totalCostPerUnitSRD
      const totalProfitSRD = profitPerUnitSRD * quantityInStock

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
    console.log('📥 Received item creation request')
    console.log('Body:', JSON.stringify(body, null, 2))
    
    // Validate the incoming data
    const validation = ItemFormSchema.safeParse(body)

    if (!validation.success) {
      console.error('❌ Validation failed:', validation.error.issues)
      return NextResponse.json({ 
        error: 'Invalid item data', 
        details: validation.error.issues,
        receivedData: body 
      }, { status: 400 })
    }

    const data = validation.data
    console.log('✅ Validation passed')

    // Build the data object for Prisma - only include defined fields
    const prismaData: any = {
      name: data.name,
      status: data.status,
      quantityInStock: data.quantityInStock,
      costPerUnitUSD: data.costPerUnitUSD,
      freightCostUSD: data.freightCostUSD || 0, // Default to 0 if not provided
      sellingPriceSRD: data.sellingPriceSRD,
      companyId: data.companyId,
    }

    // Only add optional string fields if they have values (not null, not undefined, not empty)
    if (data.supplier !== null && data.supplier !== undefined) {
      prismaData.supplier = data.supplier
    }
    if (data.supplierSku !== null && data.supplierSku !== undefined) {
      prismaData.supplierSku = data.supplierSku
    }
    if (data.orderNumber !== null && data.orderNumber !== undefined) {
      prismaData.orderNumber = data.orderNumber
    }
    if (data.notes !== null && data.notes !== undefined) {
      prismaData.notes = data.notes
    }
    if (data.assignedUserId !== null && data.assignedUserId !== undefined) {
      prismaData.assignedUserId = data.assignedUserId
    }
    if (data.locationId !== null && data.locationId !== undefined) {
      prismaData.locationId = data.locationId
    }
    
    // Handle date fields - only if they exist and are valid
    if (data.orderDate !== null && data.orderDate !== undefined) {
      try {
        prismaData.orderDate = new Date(data.orderDate)
        if (isNaN(prismaData.orderDate.getTime())) {
          console.warn('⚠️ Invalid orderDate, skipping:', data.orderDate)
          delete prismaData.orderDate
        }
      } catch (e) {
        console.warn('⚠️ Error parsing orderDate, skipping:', data.orderDate, e)
      }
    }
    if (data.expectedArrival !== null && data.expectedArrival !== undefined) {
      try {
        prismaData.expectedArrival = new Date(data.expectedArrival)
        if (isNaN(prismaData.expectedArrival.getTime())) {
          console.warn('⚠️ Invalid expectedArrival, skipping:', data.expectedArrival)
          delete prismaData.expectedArrival
        }
      } catch (e) {
        console.warn('⚠️ Error parsing expectedArrival, skipping:', data.expectedArrival, e)
      }
    }
    
    // Handle numeric optional fields - include if not null/undefined
    if (data.profitMarginPercent !== null && data.profitMarginPercent !== undefined) {
      prismaData.profitMarginPercent = data.profitMarginPercent
    }
    if (data.minStockLevel !== null && data.minStockLevel !== undefined) {
      prismaData.minStockLevel = data.minStockLevel
    }

    console.log('📦 Prisma data prepared:', JSON.stringify(prismaData, null, 2))

    // Check if an existing item with the same name and company exists
    console.log('🔍 Checking for existing item...')
    const existingItem = await prisma.item.findFirst({
      where: {
        name: data.name,
        companyId: data.companyId,
        status: { in: ['Arrived', 'Sold'] }, // Only merge with items that are already in stock or sold
      },
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

    // Check if item is being ordered and we need to deduct cash
    if (data.status === 'Ordered' || data.status === 'ToOrder') {
      console.log('💰 Checking company balance for order...')
      const company = await prisma.company.findUnique({
        where: { id: data.companyId },
        select: {
          id: true,
          name: true,
          cashBalanceUSD: true,
        },
      })

      if (!company) {
        console.error('❌ Company not found:', data.companyId)
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      // Calculate total order cost (cost per unit multiplied by quantity, freight will be added later)
      const quantityOrdered = data.quantityInStock || 0
      const totalOrderCostUSD = data.costPerUnitUSD * quantityOrdered
      console.log(`💵 Order cost: $${totalOrderCostUSD}, Available: $${company.cashBalanceUSD}`)

      // Only deduct for "Ordered" status (ToOrder doesn't deduct yet)
      if (data.status === 'Ordered') {
        // Check if company has sufficient USD balance
        if (company.cashBalanceUSD < totalOrderCostUSD) {
          console.error('❌ Insufficient funds')
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
        console.log('💳 Deducting balance...')
        await prisma.company.update({
          where: { id: data.companyId },
          data: {
            cashBalanceUSD: company.cashBalanceUSD - totalOrderCostUSD,
          },
        })
        console.log('✅ Balance deducted successfully')
      }
    }

    let item
    try {
      // If ordering more of an existing item that has arrived, update the existing item
      if (existingItem && (data.status === 'ToOrder' || data.status === 'Ordered')) {
        console.log(`♻️ Found existing item "${existingItem.name}" (ID: ${existingItem.id}). Updating instead of creating duplicate...`)
        
        const existingQty = existingItem.quantityInStock || 0
        const newQty = data.quantityInStock || 0
        const existingFreight = existingItem.freightCostUSD || 0
        const newFreight = data.freightCostUSD || 0
        
        // Calculate weighted average for cost per unit (if prices differ)
        const existingTotalCost = existingItem.costPerUnitUSD * existingQty
        const newTotalCost = data.costPerUnitUSD * newQty
        const combinedQuantity = existingQty + newQty
        const weightedAvgCostPerUnit = (existingTotalCost + newTotalCost) / combinedQuantity
        
        // Calculate weighted average for freight cost
        const weightedAvgFreightCost = (existingFreight + newFreight) / 2
        
        item = await prisma.item.update({
          where: { id: existingItem.id },
          data: {
            quantityInStock: combinedQuantity,
            costPerUnitUSD: weightedAvgCostPerUnit,
            freightCostUSD: weightedAvgFreightCost,
            sellingPriceSRD: data.sellingPriceSRD, // Use new selling price
            notes: data.notes || existingItem.notes, // Keep existing notes if no new ones
            // Update optional fields if provided
            ...(data.assignedUserId && { assignedUserId: data.assignedUserId }),
            ...(data.locationId && { locationId: data.locationId }),
            ...(data.supplier && { supplier: data.supplier }),
            ...(data.supplierSku && { supplierSku: data.supplierSku }),
            ...(data.orderNumber && { orderNumber: data.orderNumber }),
            ...(data.orderDate && { orderDate: new Date(data.orderDate) }),
            ...(data.expectedArrival && { expectedArrival: new Date(data.expectedArrival) }),
          },
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
        console.log(`✅ Updated existing item. New quantity: ${combinedQuantity} units`)
      } else {
        // Create a new item if no existing item found or status doesn't match
        console.log('💾 Creating new item in database...')
        console.log('📊 Prisma data object:', JSON.stringify(prismaData, null, 2))
        
        item = await prisma.item.create({
          data: prismaData,
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
        console.log('✅ Item created successfully with ID:', item.id)
      }
    } catch (prismaError: any) {
      console.error('❌ Prisma create operation failed!')
      console.error('Error type:', typeof prismaError)
      console.error('Error name:', prismaError?.name)
      console.error('Error message:', prismaError?.message)
      console.error('Error code:', prismaError?.code)
      console.error('Error meta:', JSON.stringify(prismaError?.meta, null, 2))
      console.error('Full error:', JSON.stringify(prismaError, null, 2))
      console.error('Stack trace:', prismaError?.stack)
      
      return NextResponse.json({ 
        error: 'Database error', 
        message: prismaError?.message || 'Unknown database error',
        code: prismaError?.code,
        meta: prismaError?.meta,
        prismaData: prismaData,  // Include what we tried to save
      }, { status: 500 })
    }

    // Sync item quantity from batches if using batch system
    if (item.useBatchSystem) {
      try {
        await syncItemQuantityFromBatches(item.id)
      } catch (syncError) {
        console.warn('⚠️ Failed to sync item quantity from batches:', syncError)
        // Don't fail the request if sync fails
      }
    }

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('❌ Unexpected error in POST handler:', error)
    console.error('Error type:', typeof error)
    console.error('Error name:', error instanceof Error ? error.name : 'N/A')
    console.error('Error message:', error instanceof Error ? error.message : String(error))
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack trace')
    
    return NextResponse.json({ 
      error: 'Internal server error', 
      message: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : typeof error
    }, { status: 500 })
  }
}