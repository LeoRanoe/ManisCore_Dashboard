"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ExpenseDataTable } from "@/components/expenses/expense-data-table"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { useExpenses, useApi } from "@/lib/hooks"
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
  
  // Fetch companies
  const { data: companiesData } = useApi<{ companies: any[] }>("/api/companies")
  
  // Mock user ID (in production this would come from auth)
  const currentUserId = "mock-user-id"

  const expenses = expensesData?.expenses || []
  const companies = companiesData?.companies || []

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalSRD = expenses.reduce((sum: number, exp: any) => 
      exp.currency === "SRD" ? sum + exp.amount : sum, 0)
    const totalUSD = expenses.reduce((sum: number, exp: any) => 
      exp.currency === "USD" ? sum + exp.amount : sum, 0)
    
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

    const thisMonthTotal = thisMonth.reduce((sum: number, exp: any) => sum + exp.amount, 0)
    const lastMonthTotal = lastMonth.reduce((sum: number, exp: any) => sum + exp.amount, 0)
    const percentageChange = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0

    return {
      totalSRD,
      totalUSD,
      thisMonthTotal,
      lastMonthTotal,
      percentageChange,
      expenseCount: expenses.length,
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">SRD {metrics.totalSRD.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Surinamese Dollar</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">${metrics.totalUSD.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">US Dollar</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">${metrics.thisMonthTotal.toFixed(2)}</div>
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Count</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {expensesLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.expenseCount}</div>
                <p className="text-xs text-muted-foreground">Total expenses recorded</p>
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
