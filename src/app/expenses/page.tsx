"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ExpenseDataTable } from "@/components/expenses/expense-data-table"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { useExpenses, useApi } from "@/lib/hooks"
import { formatCurrencyWithSign } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { DollarSign, TrendingUp, TrendingDown, Calendar, Search, Plus } from "lucide-react"

function ExpensesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Fetch expenses
  const { data: expensesData, loading: expensesLoading, error: expensesError, refresh: refreshExpenses } = useExpenses(searchQuery, categoryFilter)
  
  // Fetch companies (API returns array directly, not wrapped in object)
  const { data: companiesData } = useApi<any[]>("/api/companies")
  
  // User ID will be set from auth in the future, for now it's optional
  const currentUserId = undefined

  const expenses = expensesData?.expenses || []
  const companies = companiesData || []

  // Calculate metrics
  const metrics = useMemo(() => {
    // Expenses are stored as positive values, income as positive but flagged differently
    // Let's separate them properly - expenses should be positive numbers
    const expensesList = expenses.filter((exp: any) => exp.amount > 0 && exp.category !== 'INCOME')
    const incomeList = expenses.filter((exp: any) => exp.amount > 0 && exp.category === 'INCOME')
    
    // Calculate totals in SRD (converting USD at 40:1)
    const totalExpensesSRD = expensesList.reduce((sum: number, exp: any) => {
      const amountInSRD = exp.currency === "SRD" ? exp.amount : exp.amount * 40
      return sum + amountInSRD
    }, 0)
    
    const totalIncomeSRD = incomeList.reduce((sum: number, exp: any) => {
      const amountInSRD = exp.currency === "SRD" ? exp.amount : exp.amount * 40
      return sum + amountInSRD
    }, 0)
    
    const netSRD = totalIncomeSRD - totalExpensesSRD
    
    // Calculate this month vs last month
    const now = new Date()
    const thisMonth = expensesList.filter((exp: any) => {
      const expDate = new Date(exp.date)
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    })
    const lastMonth = expensesList.filter((exp: any) => {
      const expDate = new Date(exp.date)
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
      return expDate.getMonth() === lastMonthDate.getMonth() && expDate.getFullYear() === lastMonthDate.getFullYear()
    })
    
    const thisMonthTotal = thisMonth.reduce((sum: number, exp: any) => {
      const amountInSRD = exp.currency === "SRD" ? exp.amount : exp.amount * 40
      return sum + amountInSRD
    }, 0)
    
    const lastMonthTotal = lastMonth.reduce((sum: number, exp: any) => {
      const amountInSRD = exp.currency === "SRD" ? exp.amount : exp.amount * 40
      return sum + amountInSRD
    }, 0)
    
    const percentageChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

    // Calculate category breakdown
    const categoryBreakdown = expensesList.reduce((acc: any, exp: any) => {
      const category = exp.category || 'MISCELLANEOUS'
      const amountInSRD = exp.currency === "SRD" ? exp.amount : exp.amount * 40
      
      if (!acc[category]) {
        acc[category] = {
          total: 0,
          count: 0,
          category: category
        }
      }
      acc[category].total += amountInSRD
      acc[category].count += 1
      return acc
    }, {})

    return {
      totalExpensesSRD,
      totalIncomeSRD,
      netSRD,
      thisMonthTotal,
      lastMonthTotal,
      percentageChange,
      expensesCount: expensesList.length,
      incomeCount: incomeList.length,
      categoryBreakdown: Object.values(categoryBreakdown).sort((a: any, b: any) => b.total - a.total),
    }
  }, [expenses])

  if (expensesError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
            <p className="text-muted-foreground">Track and manage your business expenses.</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading expenses: {expensesError}</p>
          <Button onClick={refreshExpenses}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">Track and manage your business expenses.</p>
        </div>
        <ExpenseFormDialog
          companies={companies}
          currentUserId={currentUserId}
          onSuccess={refreshExpenses}
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Expense
            </Button>
          }
        />
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  SRD {metrics.totalExpensesSRD.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.expensesCount} expense{metrics.expensesCount !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  SRD {metrics.totalIncomeSRD.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics.incomeCount} income transaction{metrics.incomeCount !== 1 ? 's' : ''}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${metrics.netSRD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrencyWithSign(metrics.netSRD, 'SRD')}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Income - Expenses</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  SRD {metrics.thisMonthTotal.toFixed(2)}
                </div>
                <p className={`text-xs flex items-center gap-1 mt-1 ${
                  metrics.percentageChange > 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {metrics.percentageChange > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {Math.abs(metrics.percentageChange).toFixed(1)}% from last month
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {!expensesLoading && metrics.categoryBreakdown && metrics.categoryBreakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expenses by Category</CardTitle>
            <p className="text-sm text-muted-foreground">Breakdown of expenses across categories</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.categoryBreakdown.slice(0, 5).map((cat: any) => {
                const percentage = (cat.total / metrics.totalExpensesSRD) * 100
                const categoryName = cat.category.replace(/_/g, ' ').toLowerCase()
                  .split(' ').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
                
                return (
                  <div key={cat.category} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{categoryName}</div>
                        <div className="text-muted-foreground">({cat.count} transaction{cat.count !== 1 ? 's' : ''})</div>
                      </div>
                      <div className="font-semibold">SRD {cat.total.toFixed(2)}</div>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-red-500 transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search expenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="DINNER">Dinner</SelectItem>
            <SelectItem value="OFFICE_SUPPLIES">Office Supplies</SelectItem>
            <SelectItem value="TRANSPORTATION">Transportation</SelectItem>
            <SelectItem value="UTILITIES">Utilities</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
            <SelectItem value="MISCELLANEOUS">Miscellaneous</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <ExpenseDataTable 
        expenses={expenses.filter((exp: any) => exp.category !== 'INCOME')}
        companies={companies}
        currentUserId={currentUserId}
        onUpdate={refreshExpenses}
      />
    </div>
  )
}

export default function ExpensesPageWithLayout() {
  return (
    <DashboardLayout>
      <ExpensesPage />
    </DashboardLayout>
  )
}
