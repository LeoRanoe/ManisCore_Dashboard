"use client"

import { useEffect, useState } from "react"
import { DollarSign, Package, TrendingUp, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface DashboardMetrics {
  totalStockValueUSD: number
  totalPotentialRevenueSRD: number
  totalPotentialProfitSRD: number
  itemCountByStatus: {
    ToOrder: number
    Ordered: number
    Arrived: number
    Sold: number
  }
}

interface LowStockItem {
  id: string
  name: string
  quantityInStock: number
  status: string
  company: {
    name: string
  }
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [metricsResponse, lowStockResponse] = await Promise.all([
          fetch("/api/dashboard-metrics"),
          fetch("/api/items?limit=10&filter=lowStock"),
        ])

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
        }

        if (lowStockResponse.ok) {
          const lowStockData = await lowStockResponse.json()
          setLowStockItems(lowStockData.items?.filter((item: LowStockItem) => item.quantityInStock < 5) || [])
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const statusConfig = {
    ToOrder: { label: "To Order", variant: "secondary" as const },
    Ordered: { label: "Ordered", variant: "warning" as const },
    Arrived: { label: "Arrived", variant: "success" as const },
    Sold: { label: "Sold", variant: "default" as const },
  }

  const chartData = metrics
    ? [
        { name: "To Order", count: metrics.itemCountByStatus.ToOrder },
        { name: "Ordered", count: metrics.itemCountByStatus.Ordered },
        { name: "Arrived", count: metrics.itemCountByStatus.Arrived },
        { name: "Sold", count: metrics.itemCountByStatus.Sold },
      ]
    : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-3 w-32 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card className="col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>

          <Card className="col-span-1">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your inventory performance and key metrics.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalStockValueUSD || 0, "USD")}
            </div>
            <p className="text-xs text-muted-foreground">Total inventory investment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalPotentialRevenueSRD || 0, "SRD")}
            </div>
            <p className="text-xs text-muted-foreground">Total selling value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalPotentialProfitSRD || 0, "SRD")}
            </div>
            <p className="text-xs text-muted-foreground">Expected profit margin</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(metrics?.itemCountByStatus || {}).reduce((a, b) => a + b, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Items in inventory</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Items by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Low Stock Items</CardTitle>
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low stock items found.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockItems.slice(0, 5).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.company.name}</TableCell>
                      <TableCell>
                        <span className="font-medium text-red-600">
                          {item.quantityInStock}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[item.status as keyof typeof statusConfig]?.variant || "secondary"}>
                          {statusConfig[item.status as keyof typeof statusConfig]?.label || item.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}