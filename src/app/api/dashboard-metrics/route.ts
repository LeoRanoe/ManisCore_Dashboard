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

    // Calculate total stock value in USD
    const totalStockValueUSD = items.reduce((total: number, item: any) => {
      return total + (item.costPerUnitUSD + (item.freightCostUSD / Math.max(item.quantityInStock, 1))) * item.quantityInStock
    }, 0)

    // Calculate total potential revenue in SRD
    const totalPotentialRevenueSRD = items.reduce((total: number, item: any) => {
      return total + item.sellingPriceSRD * item.quantityInStock
    }, 0)

    // Calculate total potential profit in SRD (approximation - assuming 1 USD = 40 SRD for conversion)
    const usdToSrdRate = 40
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
        const stockValue = data.items.reduce((total, item) => {
          return total + (item.costPerUnitUSD + (item.freightCostUSD / Math.max(item.quantityInStock, 1))) * item.quantityInStock
        }, 0)
        
        const potentialRevenue = data.items.reduce((total, item) => {
          return total + item.sellingPriceSRD * item.quantityInStock
        }, 0)

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
        const stockValue = data.items.reduce((total, item) => {
          return total + (item.costPerUnitUSD + (item.freightCostUSD / Math.max(item.quantityInStock, 1))) * item.quantityInStock
        }, 0)

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
      totalStockValueUSD: Number(totalStockValueUSD.toFixed(2)),
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