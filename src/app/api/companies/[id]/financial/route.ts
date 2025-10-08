import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyFinancialUpdateSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const company = await (prisma as any).company.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
      },
    })

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    // Calculate stock value dynamically from both batch system and legacy items
    // Get all batches for items belonging to this company where status is "Arrived"
    const batches = await prisma.stockBatch.findMany({
      where: {
        item: {
          companyId: params.id
        },
        status: 'Arrived' // Only count items that have arrived
      },
      select: {
        quantity: true,
        costPerUnitUSD: true,
        freightCostUSD: true,
      }
    })

    // Also get legacy items (not using batch system) that have arrived
    const legacyItems = await prisma.item.findMany({
      where: {
        companyId: params.id,
        status: 'Arrived',
        useBatchSystem: false
      },
      select: {
        quantityInStock: true,
        costPerUnitUSD: true,
        freightCostUSD: true,
      }
    })

    // Calculate total stock value in USD from batches
    const batchStockValueUSD = batches.reduce((total, batch) => {
      // Cost = (costPerUnit + freight per unit) * quantity
      const freightPerUnit = batch.quantity > 0 ? (batch.freightCostUSD / batch.quantity) : 0
      const costPerUnit = batch.costPerUnitUSD + freightPerUnit
      return total + (costPerUnit * batch.quantity)
    }, 0)

    // Calculate total stock value in USD from legacy items
    const legacyStockValueUSD = legacyItems.reduce((total, item) => {
      // Cost = (costPerUnit + freight per unit) * quantity
      const quantity = item.quantityInStock || 0
      const freightCost = item.freightCostUSD || 0
      const freightPerUnit = quantity > 0 ? (freightCost / quantity) : 0
      const costPerUnit = item.costPerUnitUSD + freightPerUnit
      return total + (costPerUnit * quantity)
    }, 0)

    const stockValueUSD = batchStockValueUSD + legacyStockValueUSD

    // Convert to SRD (1 USD = 40 SRD)
    const exchangeRate = 40
    const stockValueSRD = stockValueUSD * exchangeRate

    // Calculate total value in both currencies
    const totalSRD = company.cashBalanceSRD + stockValueSRD
    const totalUSD = company.cashBalanceUSD + stockValueUSD
    
    // Total value in SRD including USD converted
    const totalValueSRD = totalSRD + (company.cashBalanceUSD * exchangeRate)

    return NextResponse.json({
      ...company,
      stockValueSRD: Number(stockValueSRD.toFixed(2)),
      stockValueUSD: Number(stockValueUSD.toFixed(2)),
      totalValueSRD: Number(totalValueSRD.toFixed(2)),
      totalValueUSD: Number((totalValueSRD / exchangeRate).toFixed(2)),
      exchangeRate,
    })
  } catch (error) {
    console.error('Error fetching company financial data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = CompanyFinancialUpdateSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid financial data', details: validation.error.issues }, { status: 400 })
    }

    const data = validation.data

    const updatedCompany = await (prisma as any).company.update({
      where: { id: params.id },
      data: {
        cashBalanceSRD: data.cashBalanceSRD,
        cashBalanceUSD: data.cashBalanceUSD,
        stockValueSRD: data.stockValueSRD,
        stockValueUSD: data.stockValueUSD,
      },
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
        stockValueSRD: true,
        stockValueUSD: true,
      },
    })

    // Calculate total value in both currencies
    const totalSRD = updatedCompany.cashBalanceSRD + updatedCompany.stockValueSRD
    const totalUSD = updatedCompany.cashBalanceUSD + updatedCompany.stockValueUSD
    
    // Convert USD to SRD for total calculation (1 USD = 40 SRD)
    const totalValueSRD = totalSRD + (totalUSD * 40)

    return NextResponse.json({
      ...updatedCompany,
      totalValueSRD,
      totalValueUSD: totalValueSRD / 40,
      exchangeRate: 40,
    })
  } catch (error) {
    console.error('Error updating company financial data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}