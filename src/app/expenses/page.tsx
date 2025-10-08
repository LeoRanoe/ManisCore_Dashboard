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
    // Separate income and expenses
    const income = expenses.filter((exp: any) => exp.amount > 0)
    const expensesList = expenses.filter((exp: any) => exp.amount < 0)
    
    const totalIncomeSRD = income.reduce((sum: number, exp: any) => 
      exp.currency === "SRD" ? sum + Math.abs(exp.amount) : sum, 0)
    const totalIncomeUSD = income.reduce((sum: number, exp: any) => 
      exp.currency === "USD" ? sum + Math.abs(exp.amount) : sum, 0)
    
    const totalExpensesSRD = expensesList.reduce((sum: number, exp: any) => 
      exp.currency === "SRD" ? sum + Math.abs(exp.amount) : sum, 0)
    const totalExpensesUSD = expensesList.reduce((sum: number, exp: any) => 
      exp.currency === "USD" ? sum + Math.abs(exp.amount) : sum, 0)
    
    const netSRD = totalIncomeSRD - totalExpensesSRD
    const netUSD = totalIncomeUSD - totalExpensesUSD
    
    // Calculate this month vs last month
    const now = new Date()
    const thisMonth = expenses.filter((exp: any) => {
      const expDate = new Date(exp.date)
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear()
    })
    const lastMonth = expenses.filter((exp: any) => {
      const expDate = new Date(exp.date)
      const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
      return expDate.getMonth() === lastMonthDate.getMonth() && expDate.getFullYear() === lastMonthDate.getFullYear()
    })

    const thisMonthExpenses = thisMonth.filter((exp: any) => exp.amount < 0)
    const lastMonthExpenses = lastMonth.filter((exp: any) => exp.amount < 0)
    
    const thisMonthTotal = thisMonthExpenses.reduce((sum: number, exp: any) => sum + Math.abs(exp.amount), 0)
    const lastMonthTotal = lastMonthExpenses.reduce((sum: number, exp: any) => sum + Math.abs(exp.amount), 0)
    const percentageChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

    return {
      totalIncomeSRD,
      totalIncomeUSD,
      totalExpensesSRD,
      totalExpensesUSD,
      netSRD,
      netUSD,
      thisMonthTotal,
      lastMonthTotal,
      percentageChange,
      expenseCount: expenses.length,
      incomeCount: income.length,
      expensesCount: expensesList.length,
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (SRD)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">SRD {metrics.totalExpensesSRD.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{metrics.expensesCount} expense transactions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income (SRD)</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">SRD {metrics.totalIncomeSRD.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">{metrics.incomeCount} income transactions</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net (SRD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${metrics.netSRD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrencyWithSign(metrics.netSRD, 'SRD')}
                </div>
                <p className="text-xs text-muted-foreground">Income - Expenses</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month Expenses</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">SRD {metrics.thisMonthTotal.toFixed(2)}</div>
                <p className={`text-xs flex items-center gap-1 ${metrics.percentageChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <ExpenseDataTable 
        expenses={expenses}
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
