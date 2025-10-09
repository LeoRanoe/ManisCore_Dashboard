import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Mark this route as dynamic
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // Use nextUrl.searchParams instead of new URL(request.url)
    const searchParams = request.nextUrl.searchParams
    const companyId = searchParams.get('companyId')
    const userId = searchParams.get('userId')

    // Build where clause for filtering
    const where: any = {}
    
    if (companyId && companyId !== 'all') {
      where.companyId = companyId
    }
    
    if (userId && userId !== 'all') {
      where.assignedUserId = userId
    }

    // Get all items with their related data
    const items = await prisma.item.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            cashBalanceSRD: true,
            cashBalanceUSD: true,
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
        batches: {
          select: {
            id: true,
            quantity: true,
            status: true,
            costPerUnitUSD: true,
            freightCostUSD: true,
          }
        }
      },
    })

    // Calculate total stock value in USD - only count "Arrived" items/batches
    const totalStockValueUSD = items.reduce((total: number, item: any) => {
      let itemValue = 0

      if (item.useBatchSystem && item.batches && item.batches.length > 0) {
        // Use batch system - only count batches with "Arrived" status
        item.batches.forEach((batch: any) => {
          // Only count batches that have arrived
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
        // Legacy system - only count items with "Arrived" status
        if (item.status === 'Arrived') {
          const currentQuantity = item.quantityInStock || 0
          if (currentQuantity > 0) {
            const freightCost = item.freightCostUSD || 0
            const freightPerUnit = freightCost / Math.max(currentQuantity, 1)
            const costPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
            itemValue = costPerUnit * currentQuantity
          }
        }
      }

      return total + itemValue
    }, 0)

    // Debug logging
    console.log('[Dashboard Metrics] Calculation Summary:')
    console.log(`  - Total items queried: ${items.length}`)
    console.log(`  - Batch system items: ${items.filter(i => i.useBatchSystem && i.batches?.length > 0).length}`)
    console.log(`  - Legacy items: ${items.filter(i => !i.useBatchSystem || !i.batches?.length).length}`)
    
    const arrivedBatchCount = items.reduce((sum, i) => 
      sum + (i.batches?.filter((b: any) => b.status === 'Arrived').length || 0), 0
    )
    const totalBatchCount = items.reduce((sum, i) => sum + (i.batches?.length || 0), 0)
    console.log(`  - Total batches: ${totalBatchCount}`)
    console.log(`  - Arrived batches: ${arrivedBatchCount}`)
    
    const arrivedLegacyCount = items.filter(i => 
      (!i.useBatchSystem || !i.batches?.length) && i.status === 'Arrived'
    ).length
    console.log(`  - Legacy items with Arrived status: ${arrivedLegacyCount}`)
    console.log(`  - Total stock value USD: $${totalStockValueUSD.toFixed(2)}`)

    // Get total cash for selected company
    let totalCashSRD = 0
    let totalCashUSD = 0
    if (companyId && companyId !== 'all') {
      const company = await prisma.company.findUnique({
        where: { id: companyId },
        select: {
          cashBalanceSRD: true,
          cashBalanceUSD: true,
        }
      })
      if (company) {
        totalCashSRD = company.cashBalanceSRD
        totalCashUSD = company.cashBalanceUSD
      }
    }

    const usdToSrdRate = 40
    const totalStockValueSRD = totalStockValueUSD * usdToSrdRate

    // Calculate total potential revenue in SRD - only count arrived items/batches
    const totalPotentialRevenueSRD = items.reduce((total: number, item: any) => {
      let currentQuantity = 0
      
      // Calculate actual quantity based on system used - only "Arrived" status
      if (item.useBatchSystem && item.batches && item.batches.length > 0) {
        // Only count arrived batches
        currentQuantity = item.batches
          .filter((batch: any) => batch.status === 'Arrived')
          .reduce((sum: number, batch: any) => sum + (batch.quantity || 0), 0)
      } else {
        // Legacy system - only count if item status is "Arrived"
        currentQuantity = item.status === 'Arrived' ? (item.quantityInStock || 0) : 0
      }
      
      return total + (item.sellingPriceSRD || 0) * currentQuantity
    }, 0)

    // Calculate total potential profit in SRD
    const totalCostInSRD = totalStockValueUSD * usdToSrdRate
    const totalPotentialProfitSRD = totalPotentialRevenueSRD - totalCostInSRD

    // Count items by status
    const itemCountByStatus = items.reduce((counts, item) => {
      const status = item.status || 'ToOrder'
      counts[status] = (counts[status] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    // Ensure all statuses are represented
    const statusCounts = {
      ToOrder: itemCountByStatus.ToOrder || 0,
      Ordered: itemCountByStatus.Ordered || 0,
      Arrived: itemCountByStatus.Arrived || 0,
      Sold: itemCountByStatus.Sold || 0,
    }

    // Company metrics (if not filtering by specific company)
    const companyMetrics: Record<string, any> = {}
    if (!companyId || companyId === 'all') {
      const companyGroups = items.reduce((groups, item) => {
        const companyId = item.company.id
        if (!groups[companyId]) {
          groups[companyId] = {
            name: item.company.name,
            items: [],
          }
        }
        groups[companyId].items.push(item)
        return groups
      }, {} as Record<string, { name: string; items: any[] }>)

      Object.entries(companyGroups).forEach(([id, data]) => {
        let stockValue = 0
        let potentialRevenue = 0
        
        data.items.forEach((item) => {
          if (item.useBatchSystem && item.batches && item.batches.length > 0) {
            // Calculate from arrived batches only
            item.batches.forEach((batch: any) => {
              if (batch.status === 'Arrived') {
                const batchQty = batch.quantity || 0
                if (batchQty > 0) {
                  const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
                  const costPerUnit = (batch.costPerUnitUSD || 0) + freightPerUnit
                  stockValue += costPerUnit * batchQty
                  potentialRevenue += (item.sellingPriceSRD || 0) * batchQty
                }
              }
            })
          } else {
            // Calculate from legacy system - only if status is "Arrived"
            if (item.status === 'Arrived') {
              const currentQuantity = item.quantityInStock || 0
              if (currentQuantity > 0) {
                const freightCost = item.freightCostUSD || 0
                const freightPerUnit = freightCost / Math.max(currentQuantity, 1)
                const costPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
                stockValue += costPerUnit * currentQuantity
                potentialRevenue += (item.sellingPriceSRD || 0) * currentQuantity
              }
            }
          }
        })

        companyMetrics[id] = {
          name: data.name,
          itemCount: data.items.length,
          stockValueUSD: Number(stockValue.toFixed(2)),
          potentialRevenueSRD: Number(potentialRevenue.toFixed(2)),
        }
      })
    }

    // User metrics (if not filtering by specific user)
    const userMetrics: Record<string, any> = {}
    if (!userId || userId === 'all') {
      const userGroups = items.reduce((groups, item) => {
        if (item.assignedUser) {
          const userId = item.assignedUser.id
          if (!groups[userId]) {
            groups[userId] = {
              name: item.assignedUser.name,
              items: [],
            }
          }
          groups[userId].items.push(item)
        }
        return groups
      }, {} as Record<string, { name: string; items: any[] }>)

      Object.entries(userGroups).forEach(([id, data]) => {
        let stockValue = 0
        
        data.items.forEach((item) => {
          if (item.useBatchSystem && item.batches && item.batches.length > 0) {
            // Calculate from arrived batches only
            item.batches.forEach((batch: any) => {
              if (batch.status === 'Arrived') {
                const batchQty = batch.quantity || 0
                if (batchQty > 0) {
                  const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
                  const costPerUnit = (batch.costPerUnitUSD || 0) + freightPerUnit
                  stockValue += costPerUnit * batchQty
                }
              }
            })
          } else {
            // Calculate from legacy system - only if status is "Arrived"
            if (item.status === 'Arrived') {
              const currentQuantity = item.quantityInStock || 0
              if (currentQuantity > 0) {
                const freightCost = item.freightCostUSD || 0
                const freightPerUnit = freightCost / Math.max(currentQuantity, 1)
                const costPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
                stockValue += costPerUnit * currentQuantity
              }
            }
          }
        })

        userMetrics[id] = {
          name: data.name,
          itemCount: data.items.length,
          stockValueUSD: Number(stockValue.toFixed(2)),
        }
      })
    }

    // Get low stock items (quantity < 5)
    const lowStockItems = items.filter(item => (item.quantityInStock || 0) < 5).slice(0, 10)

    return NextResponse.json({
      totalCashSRD: Number(totalCashSRD.toFixed(2)),
      totalCashUSD: Number(totalCashUSD.toFixed(2)),
      totalStockValueUSD: Number(totalStockValueUSD.toFixed(2)),
      totalStockValueSRD: Number(totalStockValueSRD.toFixed(2)),
      totalPotentialRevenueSRD: Number(totalPotentialRevenueSRD.toFixed(2)),
      totalPotentialProfitSRD: Number(totalPotentialProfitSRD.toFixed(2)),
      itemCountByStatus: statusCounts,
      companyMetrics,
      userMetrics,
      lowStockItems: lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        quantityInStock: item.quantityInStock,
        status: item.status,
        company: item.company,
        assignedUser: item.assignedUser,
        location: item.location,
      })),
      totalItems: items.length,
    })
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}