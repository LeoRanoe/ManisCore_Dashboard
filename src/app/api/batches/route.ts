import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

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
    
    // Filter by company through item relation
    if (companyId) {
      where.item = { companyId }
    }

    const batches = await prisma.$queryRaw`
      SELECT 
        sb.*,
        i.name as item_name,
        i."sellingPriceSRD" as item_selling_price,
        l.name as location_name,
        u.name as assigned_user_name,
        c.name as company_name
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      LEFT JOIN locations l ON l.id = sb."locationId"
      LEFT JOIN users u ON u.id = sb."assignedUserId"
      JOIN companies c ON c.id = i."companyId"
      ${itemId ? `WHERE sb."itemId" = ${itemId}` : ''}
      ORDER BY sb."createdAt" DESC
    `

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

    // Create batch using raw SQL
    const result = await prisma.$queryRaw<{id: string}[]>`
      INSERT INTO stock_batches (
        id, quantity, status, "costPerUnitUSD", "freightCostUSD",
        "orderDate", "expectedArrival", "orderNumber", notes,
        "createdAt", "updatedAt", "itemId", "locationId", "assignedUserId"
      )
      VALUES (
        gen_random_uuid(),
        ${quantity},
        ${status || 'ToOrder'}::"Status",
        ${costPerUnitUSD},
        ${freightCostUSD || 0},
        ${orderDate ? new Date(orderDate) : null},
        ${expectedArrival ? new Date(expectedArrival) : null},
        ${orderNumber},
        ${notes},
        ${new Date()},
        ${new Date()},
        ${itemId},
        ${locationId},
        ${assignedUserId}
      )
      RETURNING id
    `

    const batchId = result[0]?.id

    // Fetch created batch with relations
    const batch = await prisma.$queryRaw<any[]>`
      SELECT 
        sb.*,
        i.name as item_name,
        l.name as location_name,
        u.name as assigned_user_name
      FROM stock_batches sb
      JOIN items i ON i.id = sb."itemId"
      LEFT JOIN locations l ON l.id = sb."locationId"
      LEFT JOIN users u ON u.id = sb."assignedUserId"
      WHERE sb.id = ${batchId}
    `

    return NextResponse.json(batch[0], { status: 201 })
  } catch (error) {
    console.error('Error creating batch:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
