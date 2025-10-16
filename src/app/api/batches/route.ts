import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncItemQuantityFromBatches, syncItemLocationFromBatches } from '@/lib/utils'
import { validateBatchOperation } from '@/lib/validation-middleware'

export const dynamic = 'force-dynamic'

// GET /api/batches - List all batches with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const itemId = searchParams.get('itemId')
    const locationId = searchParams.get('locationId')
    const status = searchParams.get('status')
    const companyId = searchParams.get('companyId')

    const where: any = {}
    
    if (itemId) where.itemId = itemId
    if (locationId) where.locationId = locationId
    if (status) where.status = status
    
    // Filter by company through item relation - only if not "all"
    if (companyId && companyId !== 'all') {
      where.item = { companyId }
    }

    const batches = await prisma.stockBatch.findMany({
      where,
      include: {
        item: {
          include: {
            company: true
          }
        },
        location: true,
        assignedUser: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ batches })
  } catch (error) {
    console.error('Error fetching batches:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/batches - Create new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      itemId,
      quantity,
      status,
      costPerUnitUSD,
      freightCostUSD,
      locationId,
      assignedUserId,
      orderDate,
      expectedArrival,
      orderNumber,
      notes,
      imageUrls
    } = body

    // Validate required fields
    if (!itemId || quantity === undefined || !costPerUnitUSD) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, quantity, costPerUnitUSD' },
        { status: 400 }
      )
    }

    // Validate batch operation
    const validation = await validateBatchOperation('create', {
      itemId,
      quantity,
      locationId: locationId || null,
      status: status || 'ToOrder'
    })

    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.errors },
        { status: 400 }
      )
    }

    const item = validation.item
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // **BATCH CONSOLIDATION LOGIC - IMPROVED**
    // Check if a similar batch already exists (same item, location, status, and costs)
    // Only consolidate if status is NOT 'Sold' (sold batches should remain separate for tracking)
    const shouldCheckConsolidation = status !== 'Sold'
    let existingBatch = null

    if (shouldCheckConsolidation) {
      existingBatch = await prisma.stockBatch.findFirst({
        where: {
          itemId,
          locationId: locationId || null,
          status: status || 'ToOrder',
          costPerUnitUSD,
          freightCostUSD: freightCostUSD || 0,
        },
        orderBy: {
          createdAt: 'desc' // Get the most recent matching batch
        }
      })
    }

    // If a matching batch exists, consolidate by updating quantity
    if (existingBatch) {
      console.log(`Consolidating batch: Adding ${quantity} units to existing batch ${existingBatch.id}`)
      
      const updatedBatch = await prisma.stockBatch.update({
        where: { id: existingBatch.id },
        data: {
          quantity: existingBatch.quantity + quantity,
          originalQuantity: existingBatch.originalQuantity + quantity,
          // Update notes to track consolidation
          notes: existingBatch.notes 
            ? `${existingBatch.notes}\n[Consolidated: +${quantity} units on ${new Date().toISOString().split('T')[0]}]`
            : `Consolidated: +${quantity} units on ${new Date().toISOString().split('T')[0]}`,
        },
        include: {
          item: {
            include: {
              company: true
            }
          },
          location: true,
          assignedUser: true
        }
      })

      // Sync item quantity from all batches
      await syncItemQuantityFromBatches(itemId)
      
      // Sync item location if item doesn't have one
      await syncItemLocationFromBatches(itemId)

      return NextResponse.json({ 
        ...updatedBatch,
        consolidated: true,
        message: `Consolidated ${quantity} units into existing batch`
      }, { status: 200 })
    }

    // If status is "Ordered", deduct cash from company
    if (status === 'Ordered') {
      const totalCost = (costPerUnitUSD * quantity) + (freightCostUSD || 0)
      
      if (item.company.cashBalanceUSD < totalCost) {
        return NextResponse.json(
          {
            error: 'Insufficient funds',
            required: totalCost,
            available: item.company.cashBalanceUSD
          },
          { status: 400 }
        )
      }

      // Deduct cash
      await prisma.company.update({
        where: { id: item.companyId },
        data: { cashBalanceUSD: item.company.cashBalanceUSD - totalCost }
      })
    }

    // Create batch using Prisma client
    const batch = await prisma.stockBatch.create({
      data: {
        itemId,
        quantity,
        originalQuantity: quantity, // Set original quantity on creation
        status: status || 'ToOrder',
        costPerUnitUSD,
        freightCostUSD: freightCostUSD || 0,
        locationId: locationId || null,
        assignedUserId: assignedUserId || null,
        orderDate: orderDate ? new Date(orderDate) : null,
        expectedArrival: expectedArrival ? new Date(expectedArrival) : null,
        orderNumber: orderNumber || null,
        notes: notes || null,
        imageUrls: imageUrls || [],
      },
      include: {
        item: {
          include: {
            company: true
          }
        },
        location: true,
        assignedUser: true
      }
    })

    // Sync item quantity from all batches
    await syncItemQuantityFromBatches(itemId)
    
    // Sync item location if item doesn't have one
    await syncItemLocationFromBatches(itemId)

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
