import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    // Get all items with their companies
    const items = await prisma.item.findMany({
      include: {
        company: true,
      },
    })

    // Calculate total stock value in USD
    const totalStockValueUSD = items.reduce((total, item) => {
      return total + (item.costPerUnitUSD + item.freightPerUnitUSD) * item.quantityInStock
    }, 0)

    // Calculate total potential revenue in SRD
    const totalPotentialRevenueSRD = items.reduce((total, item) => {
      return total + item.sellingPriceSRD * item.quantityInStock
    }, 0)

    // Calculate total potential profit in SRD (approximation - assuming 1 USD = 3.75 SRD for conversion)
    const usdToSrdRate = 3.75
    const totalCostInSRD = totalStockValueUSD * usdToSrdRate
    const totalPotentialProfitSRD = totalPotentialRevenueSRD - totalCostInSRD

    // Count items by status
    const itemCountByStatus = items.reduce((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1
      return counts
    }, {} as Record<string, number>)

    // Ensure all statuses are represented
    const statusCounts = {
      ToOrder: itemCountByStatus.ToOrder || 0,
      Ordered: itemCountByStatus.Ordered || 0,
      Arrived: itemCountByStatus.Arrived || 0,
      Sold: itemCountByStatus.Sold || 0,
    }

    // Get low stock items (quantity < 5)
    const lowStockItems = items.filter(item => item.quantityInStock < 5).slice(0, 10)

    return NextResponse.json({
      totalStockValueUSD: Number(totalStockValueUSD.toFixed(2)),
      totalPotentialRevenueSRD: Number(totalPotentialRevenueSRD.toFixed(2)),
      totalPotentialProfitSRD: Number(totalPotentialProfitSRD.toFixed(2)),
      itemCountByStatus: statusCounts,
      lowStockItems: lowStockItems.map(item => ({
        id: item.id,
        name: item.name,
        quantityInStock: item.quantityInStock,
        status: item.status,
        companyName: item.company.name,
      })),
      totalItems: items.length,
    })
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}