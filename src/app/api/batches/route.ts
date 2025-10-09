import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { syncItemQuantityFromBatches } from '@/lib/utils'

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
      notes
    } = body

    // Validate required fields
    if (!itemId || quantity === undefined || !costPerUnitUSD) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId, quantity, costPerUnitUSD' },
        { status: 400 }
      )
    }

    // Get item to check company and handle cash deduction
    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { company: true }
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
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
        status: status || 'ToOrder',
        costPerUnitUSD,
        freightCostUSD: freightCostUSD || 0,
        locationId: locationId || null,
        assignedUserId: assignedUserId || null,
        orderDate: orderDate ? new Date(orderDate) : null,
        expectedArrival: expectedArrival ? new Date(expectedArrival) : null,
        orderNumber: orderNumber || null,
        notes: notes || null,
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

    return NextResponse.json(batch, { status: 201 })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
