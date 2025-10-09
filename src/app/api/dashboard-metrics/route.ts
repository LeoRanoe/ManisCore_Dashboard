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
    const locationId = searchParams.get('locationId')

    console.log('[Dashboard Metrics] Filters:', { companyId, userId, locationId })

    // STEP 1: Get locations managed by the user (if filtering by user)
    let managedLocationIds: string[] = []
    if (userId && userId !== 'all') {
      const managedLocations = await prisma.location.findMany({
        where: { managerId: userId },
        select: { id: true }
      })
      managedLocationIds = managedLocations.map(loc => loc.id)
      console.log('[Dashboard Metrics] User manages locations:', managedLocationIds)
    }

    // STEP 2: Build item-level where clause (company filter)
    const where: any = {}
    
    // Company filter - STRICT: Only items from this company
    if (companyId && companyId !== 'all') {
      where.companyId = companyId
      console.log('[Dashboard Metrics] Filtering by company:', companyId)
    }

    // STEP 3: Build batch-level where clause
    const batchWhere: any = {}
    
    // User filter for batches
    if (userId && userId !== 'all') {
      if (managedLocationIds.length > 0) {
        // Include batches assigned to user OR in managed locations
        batchWhere.OR = [
          { assignedUserId: userId },
          { locationId: { in: managedLocationIds } }
        ]
      } else {
        // Only batches assigned to user
        batchWhere.assignedUserId = userId
      }
      console.log('[Dashboard Metrics] Batch filter:', JSON.stringify(batchWhere))
    }
    
    // Location filter for batches
    if (locationId && locationId !== 'all') {
      batchWhere.locationId = locationId
      console.log('[Dashboard Metrics] Location filter:', locationId)
    }

    // STEP 4: Fetch items with filtered batches
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
          where: Object.keys(batchWhere).length > 0 ? batchWhere : undefined,
          select: {
            id: true,
            quantity: true,
            status: true,
            costPerUnitUSD: true,
            freightCostUSD: true,
            assignedUserId: true,
            locationId: true,
            assignedUser: {
              select: {
                id: true,
                name: true,
              }
            },
            location: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
    })

    console.log('[Dashboard Metrics] Raw items fetched:', items.length)

    // STEP 5: Filter items based on whether they have valid data
    const filteredItems = items.filter(item => {
      // For batch-system items: Keep only if they have at least one batch after filtering
      if (item.useBatchSystem) {
        if (!item.batches || item.batches.length === 0) {
          return false // No matching batches, exclude item
        }
        return true // Has matching batches, include item
      } 
      
      // For legacy (non-batch) items: Apply filters at item level
      else {
        // User filter for legacy items
        if (userId && userId !== 'all') {
          const isAssignedToUser = item.assignedUserId === userId
          const isInManagedLocation = item.locationId && managedLocationIds.includes(item.locationId)
          
          if (!isAssignedToUser && !isInManagedLocation) {
            return false // Item not assigned to user and not in managed location
          }
        }
        
        // Location filter for legacy items
        if (locationId && locationId !== 'all') {
          if (item.locationId !== locationId) {
            return false // Item not in specified location
          }
        }
        
        return true // Passes all filters
      }
    })

    console.log('[Dashboard Metrics] Filtered items:', filteredItems.length)

    // Calculate total stock value in USD - only count "Arrived" items/batches
    const totalStockValueUSD = filteredItems.reduce((total: number, item: any) => {
      let itemValue = 0

      if (item.useBatchSystem && item.batches && item.batches.length > 0) {
        // Use batch system - only count batches with "Arrived" status
        item.batches.forEach((batch: any) => {
          // Only count batches that have arrived
          if (batch.status === 'Arrived') {
            const batchQty = batch.quantity || 0
            if (batchQty > 0) {
              // Use batch cost, but fall back to item cost if batch cost is 0
              const batchCost = batch.costPerUnitUSD || item.costPerUnitUSD || 0
              const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
              const costPerUnit = batchCost + freightPerUnit
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
    console.log(`  - Total items queried: ${filteredItems.length}`)
    console.log(`  - Batch system items: ${filteredItems.filter(i => i.useBatchSystem && i.batches?.length > 0).length}`)
    console.log(`  - Legacy items: ${filteredItems.filter(i => !i.useBatchSystem || !i.batches?.length).length}`)
    
    const arrivedBatchCount = filteredItems.reduce((sum, i) => 
      sum + (i.batches?.filter((b: any) => b.status === 'Arrived').length || 0), 0
    )
    const totalBatchCount = filteredItems.reduce((sum, i) => sum + (i.batches?.length || 0), 0)
    console.log(`  - Total batches: ${totalBatchCount}`)
    console.log(`  - Arrived batches: ${arrivedBatchCount}`)
    
    const arrivedLegacyCount = filteredItems.filter(i => 
      (!i.useBatchSystem || !i.batches?.length) && i.status === 'Arrived'
    ).length
    console.log(`  - Legacy items with Arrived status: ${arrivedLegacyCount}`)
    console.log(`  - Total stock value USD: $${totalStockValueUSD.toFixed(2)}`)

    // Get total cash for selected company
    let totalCashSRD = 0
    let totalCashUSD = 0
    
    // When filtering by specific company, get its cash balances
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
    } else {
      // When showing all companies, aggregate their cash
      const companies = await prisma.company.findMany({
        select: {
          cashBalanceSRD: true,
          cashBalanceUSD: true,
        }
      })
      totalCashSRD = companies.reduce((sum, c) => sum + c.cashBalanceSRD, 0)
      totalCashUSD = companies.reduce((sum, c) => sum + c.cashBalanceUSD, 0)
    }

    const usdToSrdRate = 40
    const totalStockValueSRD = totalStockValueUSD * usdToSrdRate

    // Calculate total potential revenue in SRD - only count arrived items/batches
    const totalPotentialRevenueSRD = filteredItems.reduce((total: number, item: any) => {
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

    // Calculate "If All Sold" - total potential revenue based on ALL original inventory
    // This represents what the company would earn if they sold ALL inventory they ever purchased
    // This value should remain constant regardless of current sales
    const totalIfAllSoldSRD = filteredItems.reduce((total: number, item: any) => {
      let originalTotalQuantity = 0
      
      // Calculate original total quantity based on system used
      if (item.useBatchSystem && item.batches && item.batches.length > 0) {
        // Sum ALL batches' original quantities (regardless of status or current quantity)
        originalTotalQuantity = item.batches
          .reduce((sum: number, batch: any) => sum + (batch.originalQuantity || batch.quantity || 0), 0)
      } else {
        // Legacy system - use quantityInStock as proxy for original (legacy items don't have batch tracking)
        originalTotalQuantity = item.quantityInStock || 0
      }
      
      return total + (item.sellingPriceSRD || 0) * originalTotalQuantity
    }, 0)

    // Calculate total potential profit in SRD
    const totalCostInSRD = totalStockValueUSD * usdToSrdRate
    const totalPotentialProfitSRD = totalPotentialRevenueSRD - totalCostInSRD

    // Count items by status
    const itemCountByStatus = filteredItems.reduce((counts, item) => {
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

    // Company metrics - ONLY show when viewing "All Companies" with no user/location filters
    // This gives a breakdown by company when looking at the entire portfolio
    const companyMetrics: Record<string, any> = {}
    if ((!companyId || companyId === 'all') && (!userId || userId === 'all') && (!locationId || locationId === 'all')) {
      const companyGroups = filteredItems.reduce((groups, item) => {
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
                  // Use batch cost, but fall back to item cost if batch cost is 0
                  const batchCost = batch.costPerUnitUSD || item.costPerUnitUSD || 0
                  const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
                  const costPerUnit = batchCost + freightPerUnit
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
          stockValue: Number(stockValue.toFixed(2)),
          potentialRevenue: Number(potentialRevenue.toFixed(2)),
        }
      })
    }

    // User metrics - ONLY show when NOT filtering by a specific user
    // This shows which users manage what inventory
    const userMetrics: Record<string, any> = {}
    if (!userId || userId === 'all') {
      const userGroups: Record<string, { name: string; items: Map<string, any> }> = {}
      
      filteredItems.forEach((item) => {
        if (item.useBatchSystem && item.batches && item.batches.length > 0) {
          // For batch system, group by batch's assigned user
          item.batches.forEach((batch: any) => {
            if (batch.assignedUser) {
              const userId = batch.assignedUser.id
              if (!userGroups[userId]) {
                userGroups[userId] = {
                  name: batch.assignedUser.name,
                  items: new Map(),
                }
              }
              // Store item with this specific batch
              if (!userGroups[userId].items.has(item.id)) {
                userGroups[userId].items.set(item.id, { ...item, batches: [] })
              }
              userGroups[userId].items.get(item.id).batches.push(batch)
            }
          })
        } else if (item.assignedUser) {
          // For legacy system, use item's assigned user
          const userId = item.assignedUser.id
          if (!userGroups[userId]) {
            userGroups[userId] = {
              name: item.assignedUser.name,
              items: new Map(),
            }
          }
          userGroups[userId].items.set(item.id, item)
        }
      })

      Object.entries(userGroups).forEach(([id, data]) => {
        let stockValue = 0
        const itemsArray = Array.from(data.items.values())
        
        itemsArray.forEach((item) => {
          if (item.useBatchSystem && item.batches && item.batches.length > 0) {
            // Calculate from arrived batches only
            item.batches.forEach((batch: any) => {
              if (batch.status === 'Arrived') {
                const batchQty = batch.quantity || 0
                if (batchQty > 0) {
                  const batchCost = batch.costPerUnitUSD || item.costPerUnitUSD || 0
                  const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
                  const costPerUnit = batchCost + freightPerUnit
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
          itemCount: data.items.size,
          stockValue: Number(stockValue.toFixed(2)),
        }
      })
    }

    // Get low stock items (quantity < 5)
    const lowStockItems = filteredItems.filter(item => (item.quantityInStock || 0) < 5).slice(0, 10)

    return NextResponse.json({
      totalCashSRD: Number(totalCashSRD.toFixed(2)),
      totalCashUSD: Number(totalCashUSD.toFixed(2)),
      totalStockValueUSD: Number(totalStockValueUSD.toFixed(2)),
      totalStockValueSRD: Number(totalStockValueSRD.toFixed(2)),
      totalPotentialRevenueSRD: Number(totalPotentialRevenueSRD.toFixed(2)),
      totalIfAllSoldSRD: Number(totalIfAllSoldSRD.toFixed(2)), // New metric for "If All Sold"
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
      totalItems: filteredItems.length,
    })
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}