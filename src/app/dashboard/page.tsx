"use client"

import { useEffect, useState } from "react"
import { DollarSign, Package, TrendingUp, AlertTriangle, Building2, Users, MapPin, Coins, Receipt } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { formatCurrencyWithSign } from "@/lib/utils"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

interface DashboardMetrics {
  totalStockValueUSD: number
  totalPotentialRevenueSRD: number
  totalIfAllSoldSRD: number
  totalPotentialProfitSRD: number
  itemCountByStatus: {
    ToOrder: number
    Ordered: number
    Arrived: number
    Sold: number
  }
  companyMetrics?: {
    [companyId: string]: {
      name: string
      itemCount: number
      stockValue: number
      potentialRevenue: number
    }
  }
  userMetrics?: {
    [userId: string]: {
      name: string
      itemCount: number
      stockValue: number
    }
  }
  recentItems?: Array<{
    id: string
    name: string
    status: string
    company: { name: string }
    assignedUser?: { name: string }
    location?: { name: string }
  }>
}

interface FinancialSummary {
  totalCashSRD: number
  totalCashUSD: number
  totalStockValueSRD: number
  totalStockValueUSD: number
  totalExpensesSRD: number
  totalExpensesUSD: number
  companies: Array<{
    id: string
    name: string
    cashBalanceSRD: number
    cashBalanceUSD: number
    stockValueSRD: number
    stockValueUSD: number
    totalValueSRD: number
  }>
}

interface Company {
  id: string
  name: string
}

interface LowStockItem {
  id: string
  name: string
  quantityInStock: number
  status: string
  company: {
    id: string
    name: string
  }
  assignedUser?: {
    id: string
    name: string
  }
  location?: {
    id: string
    name: string
  }
}

interface Company {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

interface Location {
  id: string
  name: string
}

function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [selectedLocation, setSelectedLocation] = useState<string>("all")
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [locationStockData, setLocationStockData] = useState<any[]>([])
  const [topProfitItems, setTopProfitItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch companies, users, and locations
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [companiesResponse, usersResponse, locationsResponse] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/users"),
          fetch("/api/locations"),
        ])

        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json()
          setCompanies(companiesData || [])
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.users || [])
        }

        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          setLocations(locationsData.locations || [])
        }
      } catch (error) {
        console.error("Error fetching reference data:", error)
      }
    }

    fetchReferenceData()
  }, [])

  // Fetch dashboard metrics based on filters
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams()
        
        if (selectedCompany !== "all") {
          params.append("companyId", selectedCompany)
        }
        
        if (selectedUser !== "all") {
          params.append("userId", selectedUser)
        }
        
        if (selectedLocation !== "all") {
          params.append("locationId", selectedLocation)
        }

        const metricsResponse = await fetch(`/api/dashboard-metrics?${params}`)

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
          setLowStockItems(metricsData.lowStockItems || [])
        }

        // Fetch batches to calculate location stock distribution
        const batchesResponse = await fetch("/api/batches?limit=10000")
        if (batchesResponse.ok) {
          const batchesData = await batchesResponse.json()
          const batches = batchesData.batches || []
          
          console.log('[Dashboard] Total batches fetched:', batches.length)
          
          // Only include arrived batches
          const arrivedBatches = batches.filter((b: any) => b.status === "Arrived")
          console.log('[Dashboard] Arrived batches:', arrivedBatches.length)
          
          // Group by location
          const locationMap = new Map()
          arrivedBatches.forEach((batch: any) => {
            if (!batch.location) {
              console.log('[Dashboard] Batch without location:', batch.id)
              return
            }
            
            const locationId = batch.location.id
            const locationName = batch.location.name
            
            if (!locationMap.has(locationId)) {
              locationMap.set(locationId, {
                name: locationName,
                quantity: 0,
                value: 0,
              })
            }
            
            const location = locationMap.get(locationId)
            location.quantity += batch.quantity || 0
            
            // Calculate value
            const costPerUnit = batch.costPerUnitUSD || 0
            const freightPerUnit = batch.quantity > 0 ? (batch.freightCostUSD || 0) / batch.quantity : 0
            const batchValue = (costPerUnit + freightPerUnit) * (batch.quantity || 0)
            location.value += batchValue
            
            console.log(`[Dashboard] Batch ${batch.id}: location=${locationName}, qty=${batch.quantity}, value=${batchValue.toFixed(2)}`)
          })
          
          // Convert to array and sort by value
          const locationData = Array.from(locationMap.values())
            .filter((loc) => loc.quantity > 0) // Show locations with ANY quantity
            .sort((a, b) => b.value - a.value || b.quantity - a.quantity) // Sort by value, then quantity
            .slice(0, 10) // Top 10 locations
          
          console.log('[Dashboard] Location stock data:', locationData)
          setLocationStockData(locationData)
        }

        // Fetch items to calculate profit margins
        const itemsResponse = await fetch(`/api/items?limit=1000&${params}`)
        if (itemsResponse.ok) {
          const itemsData = await itemsResponse.json()
          const items = itemsData.items || []
          
          console.log('[Dashboard] Total items fetched:', items.length)
          
          // Calculate profit margin for each item
          const profitData = items
            .filter((item: any) => {
              // Only include arrived items with quantity > 0
              const isValid = item.status === "Arrived" && item.quantityInStock > 0
              if (!isValid) {
                console.log(`[Dashboard] Filtered out item: ${item.name}, status=${item.status}, qty=${item.quantityInStock}`)
              }
              return isValid
            })
            .map((item: any) => {
              const quantity = item.quantityInStock || 0
              const costPerUnit = item.costPerUnitUSD || 0
              const freightPerUnit = quantity > 0 ? (item.freightCostUSD || 0) / quantity : 0
              const totalCostPerUnit = (costPerUnit + freightPerUnit) * 40 // Convert to SRD
              const sellingPrice = item.sellingPriceSRD || 0
              const profitPerUnit = sellingPrice - totalCostPerUnit
              const totalProfit = profitPerUnit * quantity
              const profitMargin = sellingPrice > 0 ? (profitPerUnit / sellingPrice) * 100 : 0
              
              console.log(`[Dashboard] Item: ${item.name}, margin=${profitMargin.toFixed(2)}%, profit=${totalProfit.toFixed(2)}`)
              
              return {
                name: item.name,
                profitMargin: profitMargin,
                totalProfit: totalProfit,
                quantity: quantity,
                sellingPrice: sellingPrice,
                costPerUnit: costPerUnit,
                freightPerUnit: freightPerUnit,
                totalCostPerUnit: totalCostPerUnit,
              }
            })
            .filter((item: any) => {
              // Only positive margins and items with selling price
              const isValid = item.profitMargin > 0 && item.sellingPrice > 0
              if (!isValid) {
                console.log(`[Dashboard] Filtered out (no profit): ${item.name}, margin=${item.profitMargin.toFixed(2)}%, price=${item.sellingPrice}`)
              }
              return isValid
            })
            .sort((a: any, b: any) => b.profitMargin - a.profitMargin)
            .slice(0, 10) // Top 10
          
          console.log('[Dashboard] Profit items data:', profitData)
          setTopProfitItems(profitData)
        }

        // Fetch financial summary
        const [companiesResponse, expensesResponse] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/expenses"),
        ])

        if (companiesResponse.ok && expensesResponse.ok) {
          const companiesData = await companiesResponse.json()
          const expensesData = await expensesResponse.json()

          // Fetch financial data for each company
          const companiesWithFinancials = await Promise.all(
            (companiesData || []).map(async (company: any) => {
              try {
                const financialResponse = await fetch(`/api/companies/${company.id}/financial`)
                if (financialResponse.ok) {
                  const financialData = await financialResponse.json()
                  return {
                    id: company.id,
                    name: company.name,
                    cashBalanceSRD: financialData.cashBalanceSRD || 0,
                    cashBalanceUSD: financialData.cashBalanceUSD || 0,
                    stockValueSRD: financialData.stockValueSRD || 0,
                    stockValueUSD: financialData.stockValueUSD || 0,
                    totalValueSRD: financialData.totalValueSRD || 0,
                  }
                }
                return {
                  id: company.id,
                  name: company.name,
                  cashBalanceSRD: 0,
                  cashBalanceUSD: 0,
                  stockValueSRD: 0,
                  stockValueUSD: 0,
                  totalValueSRD: 0,
                }
              } catch (error) {
                console.error(`Error fetching financial data for ${company.name}:`, error)
                return {
                  id: company.id,
                  name: company.name,
                  cashBalanceSRD: 0,
                  cashBalanceUSD: 0,
                  stockValueSRD: 0,
                  stockValueUSD: 0,
                  totalValueSRD: 0,
                }
              }
            })
          )

          // Calculate expense totals (excluding INCOME)
          const expenses = expensesData?.expenses || []
          const totalExpensesSRD = expenses
            .filter((e: any) => e.currency === "SRD" && e.category !== "INCOME")
            .reduce((sum: number, e: any) => sum + e.amount, 0)
          const totalExpensesUSD = expenses
            .filter((e: any) => e.currency === "USD" && e.category !== "INCOME")
            .reduce((sum: number, e: any) => sum + e.amount, 0)

          setFinancialSummary({
            totalCashSRD: companiesWithFinancials.reduce((sum, c) => sum + c.cashBalanceSRD, 0),
            totalCashUSD: companiesWithFinancials.reduce((sum, c) => sum + c.cashBalanceUSD, 0),
            totalStockValueSRD: companiesWithFinancials.reduce((sum, c) => sum + c.stockValueSRD, 0),
            totalStockValueUSD: companiesWithFinancials.reduce((sum, c) => sum + c.stockValueUSD, 0),
            totalExpensesSRD,
            totalExpensesUSD,
            companies: companiesWithFinancials,
          })
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [selectedCompany, selectedUser, selectedLocation])

  const formatCurrency = (amount: number, currency: string) => {
    // Handle null/undefined amounts
    if (amount === null || amount === undefined || isNaN(amount)) {
      amount = 0
    }
    
    if (currency === "SRD") {
      // SRD is not a standard ISO currency code, format manually
      return `SRD ${amount.toFixed(2)}`
    }
    
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
        { name: "To Order", count: metrics.itemCountByStatus.ToOrder, fill: "#94a3b8" },
        { name: "Ordered", count: metrics.itemCountByStatus.Ordered, fill: "#f59e0b" },
        { name: "Arrived", count: metrics.itemCountByStatus.Arrived, fill: "#10b981" },
        { name: "Sold", count: metrics.itemCountByStatus.Sold, fill: "#3b82f6" },
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
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your inventory performance and key metrics.
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-[180px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[180px]">
              <Users className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Users</SelectItem>
              {users.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[180px]">
              <MapPin className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Locations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Financial Summary */}
      {financialSummary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash (SRD)</CardTitle>
                <Coins className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalCashSRD, "SRD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Liquid cash in SRD</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash (USD)</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalCashUSD, "USD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Liquid cash in USD</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Value (Cost)</CardTitle>
                <Package className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalStockValueSRD, "SRD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Investment in inventory</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialSummary.totalExpensesSRD + (financialSummary.totalExpensesUSD * 40), "SRD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Recorded expenses</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Worth</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${
                  (financialSummary.totalCashSRD + (financialSummary.totalCashUSD * 40) + financialSummary.totalStockValueSRD - 
                  (financialSummary.totalExpensesSRD + (financialSummary.totalExpensesUSD * 40))) >= 0
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : 'text-red-600 dark:text-red-400'
                }`}>
                  {formatCurrencyWithSign(
                    financialSummary.totalCashSRD + (financialSummary.totalCashUSD * 40) + financialSummary.totalStockValueSRD - 
                    (financialSummary.totalExpensesSRD + (financialSummary.totalExpensesUSD * 40)), 
                    "SRD"
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cost basis accounting</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">If All Sold</CardTitle>
                <TrendingUp className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(
                    financialSummary.totalCashSRD + (financialSummary.totalCashUSD * 40) + 
                    (metrics?.totalIfAllSoldSRD || 0) - 
                    (financialSummary.totalExpensesSRD + (financialSummary.totalExpensesUSD * 40)), 
                    "SRD"
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">At selling prices</p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Main Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Investment</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalStockValueUSD || 0, "USD")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Cost basis of all inventory
            </p>
            <p className="text-xs text-muted-foreground/60">
              ≈ {formatCurrency((metrics?.totalStockValueUSD || 0) * 40, "SRD")}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(metrics?.totalPotentialRevenueSRD || 0, "SRD")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              If all inventory sells at list price
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Potential Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              (metrics?.totalPotentialProfitSRD || 0) >= 0 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {formatCurrencyWithSign(metrics?.totalPotentialProfitSRD || 0, "SRD")}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Expected profit margin on inventory
            </p>
            {metrics?.totalStockValueUSD && metrics?.totalStockValueUSD > 0 && (
              <p className="text-xs text-muted-foreground/60">
                {((metrics?.totalPotentialProfitSRD || 0) / ((metrics?.totalStockValueUSD || 1) * 40) * 100).toFixed(1)}% margin
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.values(metrics?.itemCountByStatus || {}).reduce((a, b) => a + b, 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique products in system
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Tables */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Stock Distribution by Location
            </CardTitle>
            <CardDescription>Value and quantity of inventory across locations</CardDescription>
          </CardHeader>
          <CardContent>
            {locationStockData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <MapPin className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">No location data available</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Assign items to locations to see distribution</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={locationStockData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis type="category" dataKey="name" className="text-xs" width={100} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                    formatter={(value: any, name: string) => {
                      if (name === 'Stock Value (USD)') return [`$${Number(value).toFixed(2)}`, 'Stock Value']
                      if (name === 'Quantity') return [value, 'Units']
                      return [value, name]
                    }}
                  />
                  <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Quantity" />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 8, 8, 0]} name="Stock Value (USD)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Low Stock Alert
              </CardTitle>
              <CardDescription>Items with less than 5 units in stock</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">All items are well stocked!</p>
                <p className="text-xs text-muted-foreground/60 mt-1">No items below 5 units</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="hidden sm:table-cell">Company</TableHead>
                      <TableHead className="text-center">Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.slice(0, 5).map((item) => (
                      <TableRow key={item.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">
                          <div>
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-xs text-muted-foreground sm:hidden">
                              {item.company.name}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground">
                          {item.company.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-bold px-2 py-1 rounded-md ${
                            item.quantityInStock === 0 
                              ? 'text-red-600 bg-red-100 dark:bg-red-950/30' 
                              : item.quantityInStock < 3
                              ? 'text-orange-600 bg-orange-100 dark:bg-orange-950/30'
                              : 'text-yellow-600 bg-yellow-100 dark:bg-yellow-950/30'
                          }`}>
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
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Profit Analysis Chart */}
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Items by Profit Potential
          </CardTitle>
          <CardDescription>Items with highest profit margins (in stock)</CardDescription>
        </CardHeader>
        <CardContent>
          {topProfitItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No profit data available</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Add items with pricing to see profit analysis</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={topProfitItems} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis type="category" dataKey="name" className="text-xs" width={120} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'Profit Margin') return [`${value.toFixed(1)}%`, 'Profit Margin']
                    if (name === 'Total Profit') return [`SRD ${value.toFixed(2)}`, 'Total Profit']
                    return [value, name]
                  }}
                />
                <Bar dataKey="profitMargin" fill="#8b5cf6" radius={[0, 8, 8, 0]} name="Profit Margin" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Company Metrics (when viewing all companies) */}
      {selectedCompany === "all" && metrics?.companyMetrics && Object.keys(metrics.companyMetrics).length > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Company Performance
            </CardTitle>
            <CardDescription>Financial overview by company</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(metrics.companyMetrics).map(([companyId, data]) => (
                <Card key={companyId} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      {data.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Items:</span>
                        <span className="font-semibold">{data.itemCount}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Investment:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(data.stockValue, "USD")}
                        </span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Pot. Revenue:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">
                          {formatCurrency(data.potentialRevenue, "SRD")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Metrics (when viewing all users) */}
      {selectedUser === "all" && metrics?.userMetrics && Object.keys(metrics.userMetrics).length > 0 && (
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              User Performance
            </CardTitle>
            <CardDescription>Inventory assigned to each user</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(metrics.userMetrics).map(([userId, data]) => (
                <Card key={userId} className="border-2 hover:border-primary/50 transition-colors">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      {data.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Items:</span>
                        <span className="font-semibold">{data.itemCount}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded-md bg-muted/50">
                        <span className="text-muted-foreground">Value:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {formatCurrency(data.stockValue, "USD")}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Wrap the component with DashboardLayout
export default function DashboardPageWithLayout() {
  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  )
}