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

    // Calculate stock value dynamically from batches
    // Get all batches for items belonging to this company where status is not "Sold"
    const batches = await prisma.stockBatch.findMany({
      where: {
        item: {
          companyId: params.id
        },
        status: {
          in: ['ToOrder', 'Ordered', 'Arrived']
        }
      },
      select: {
        quantity: true,
        costPerUnitUSD: true,
        freightCostUSD: true,
      }
    })

    // Calculate total stock value in USD
    const stockValueUSD = batches.reduce((total, batch) => {
      // Cost = (costPerUnit + freight per unit) * quantity
      const costPerUnit = batch.costPerUnitUSD + (batch.freightCostUSD / batch.quantity)
      return total + (costPerUnit * batch.quantity)
    }, 0)

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