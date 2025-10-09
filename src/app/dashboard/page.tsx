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

function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch companies and users
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        const [companiesResponse, usersResponse] = await Promise.all([
          fetch("/api/companies"),
          fetch("/api/users"),
        ])

        if (companiesResponse.ok) {
          const companiesData = await companiesResponse.json()
          setCompanies(companiesData || [])
        }

        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.users || [])
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

        const metricsResponse = await fetch(`/api/dashboard-metrics?${params}`)

        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
          setLowStockItems(metricsData.lowStockItems || [])
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

          // Calculate expense totals
          const expenses = expensesData?.expenses || []
          const totalExpensesSRD = expenses.filter((e: any) => e.currency === "SRD").reduce((sum: number, e: any) => sum + e.amount, 0)
          const totalExpensesUSD = expenses.filter((e: any) => e.currency === "USD").reduce((sum: number, e: any) => sum + e.amount, 0)

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
  }, [selectedCompany, selectedUser])

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
        </div>
      </div>

      {/* Financial Summary */}
      {financialSummary && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance (SRD)</CardTitle>
                <Coins className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalCashSRD, "SRD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available liquid cash in SRD</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance (USD)</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalCashUSD, "USD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available liquid cash in USD</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value (SRD)</CardTitle>
                <Package className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(financialSummary.totalStockValueSRD, "SRD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Total value of all stock (cost basis)</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Receipt className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(financialSummary.totalExpensesSRD + (financialSummary.totalExpensesUSD * 40), "SRD")}
                </div>
                <p className="text-xs text-muted-foreground mt-1">All recorded expenses</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Net Worth</CardTitle>
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
                <p className="text-xs text-muted-foreground mt-1">Cash + Inventory - Expenses</p>
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
              <Package className="h-5 w-5" />
              Items by Status
            </CardTitle>
            <CardDescription>Distribution of inventory items across different stages</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--background))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
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