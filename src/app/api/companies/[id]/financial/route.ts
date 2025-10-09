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

    // Calculate stock value dynamically from items/batches with "Arrived" status
    // Query items to calculate total stock value
    const items = await prisma.item.findMany({
      where: {
        companyId: params.id,
      },
      include: {
        batches: {
          select: {
            quantity: true,
            costPerUnitUSD: true,
            freightCostUSD: true,
            status: true
          }
        }
      }
    })

    // Calculate total stock value in USD - only count "Arrived" items/batches
    const stockValueUSD = items.reduce((total, item) => {
      let itemValue = 0
      
      if (item.useBatchSystem && item.batches.length > 0) {
        // For batch items: only count batches with "Arrived" status
        item.batches.forEach((batch) => {
          if (batch.status === 'Arrived') {
            const batchQty = batch.quantity || 0
            if (batchQty > 0) {
              const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
              const costPerUnit = (batch.costPerUnitUSD || 0) + freightPerUnit
              itemValue += costPerUnit * batchQty
            }
          }
        })
      } else {
        // For legacy items: only count if item status is "Arrived"
        if (item.status === 'Arrived') {
          const quantity = item.quantityInStock || 0
          if (quantity > 0) {
            const freightCost = item.freightCostUSD || 0
            const freightPerUnit = freightCost / Math.max(quantity, 1)
            const costPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
            itemValue = costPerUnit * quantity
          }
        }
      }
      
      return total + itemValue
    }, 0)

    // Debug logging
    const batchItemsCount = items.filter(i => i.useBatchSystem && i.batches.length > 0).length
    const legacyItemsCount = items.filter(i => !i.useBatchSystem || i.batches.length === 0).length
    const totalBatches = items.reduce((sum, i) => sum + i.batches.length, 0)
    const arrivedBatches = items.reduce((sum, i) => 
      sum + i.batches.filter(b => b.status === 'Arrived').length, 0
    )
    const totalBatchQty = items.reduce((sum, i) => 
      sum + i.batches
        .filter(b => b.status === 'Arrived')
        .reduce((bSum, b) => bSum + (b.quantity || 0), 0), 0
    )
    
    console.log(`[Financial API] Company ${params.id}:`)
    console.log(`  - Total items: ${items.length}`)
    console.log(`  - Items using batches: ${batchItemsCount}`)
    console.log(`  - Legacy items: ${legacyItemsCount}`)
    console.log(`  - Total batches: ${totalBatches}`)
    console.log(`  - Arrived batches: ${arrivedBatches}`)
    console.log(`  - Total arrived batch quantity: ${totalBatchQty}`)
    console.log(`  - Total stock value USD: $${stockValueUSD.toFixed(2)}`)

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