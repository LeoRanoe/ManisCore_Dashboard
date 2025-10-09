import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const items = await prisma.item.findMany({
      include: {
        batches: {
          select: {
            id: true,
            quantity: true,
            status: true,
            costPerUnitUSD: true,
            freightCostUSD: true,
          }
        },
        company: {
          select: {
            name: true
          }
        }
      }
    })

    const report = items.map(item => ({
      itemName: item.name,
      company: item.company.name,
      itemStatus: item.status,
      useBatchSystem: item.useBatchSystem,
      quantityInStock: item.quantityInStock,
      costPerUnitUSD: item.costPerUnitUSD,
      freightCostUSD: item.freightCostUSD,
      batches: item.batches.map(batch => ({
        id: batch.id,
        status: batch.status,
        quantity: batch.quantity,
        costPerUnitUSD: batch.costPerUnitUSD,
        freightCostUSD: batch.freightCostUSD,
      })),
      calculatedValue: (() => {
        if (item.useBatchSystem && item.batches.length > 0) {
          return item.batches
            .filter(b => b.status === 'Arrived')
            .reduce((sum, batch) => {
              const qty = batch.quantity || 0
              if (qty > 0) {
                // Use batch cost, fall back to item cost if batch cost is 0
                const batchCost = batch.costPerUnitUSD || item.costPerUnitUSD || 0
                const freightPerUnit = batch.freightCostUSD / Math.max(qty, 1)
                const costPerUnit = batchCost + freightPerUnit
                return sum + (costPerUnit * qty)
              }
              return sum
            }, 0)
        } else {
          if (item.status === 'Arrived') {
            const qty = item.quantityInStock || 0
            if (qty > 0) {
              const freightPerUnit = (item.freightCostUSD || 0) / Math.max(qty, 1)
              const costPerUnit = item.costPerUnitUSD + freightPerUnit
              return costPerUnit * qty
            }
          }
          return 0
        }
      })()
    }))

    const totalValue = report.reduce((sum, item) => sum + item.calculatedValue, 0)

    return NextResponse.json({
      summary: {
        totalItems: items.length,
        totalValue: Number(totalValue.toFixed(2)),
        batchSystemItems: items.filter(i => i.useBatchSystem && i.batches.length > 0).length,
        legacyItems: items.filter(i => !i.useBatchSystem || i.batches.length === 0).length,
        totalBatches: items.reduce((sum, i) => sum + i.batches.length, 0),
        arrivedBatches: items.reduce((sum, i) => 
          sum + i.batches.filter(b => b.status === 'Arrived').length, 0
        ),
        itemsWithArrivedStatus: items.filter(i => i.status === 'Arrived').length,
      },
      items: report
    })
  } catch (error) {
    console.error('Error in debug endpoint:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
