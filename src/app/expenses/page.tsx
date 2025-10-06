"use client"

import { useEffect, useState, useCallback } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog"
import { ExpenseDataTable } from "@/components/expenses/expense-data-table"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, TrendingDown, Calendar, Filter, X } from "lucide-react"

interface Expense {
  id: string
  description: string
  amount: number
  currency: "SRD" | "USD"
  category: string
  date: string
  company: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
    email: string
  }
}

interface Company {
  id: string
  name: string
  cashBalanceSRD: number
  cashBalanceUSD: number
}

interface User {
  id: string
  name: string
  email: string
}

function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  
  // Filters
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [selectedUser, setSelectedUser] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [selectedCurrency, setSelectedCurrency] = useState<string>("all")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")

  const { toast } = useToast()

  const fetchExpenses = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCompany && selectedCompany !== "all") params.append('companyId', selectedCompany)
      if (selectedUser && selectedUser !== "all") params.append('userId', selectedUser)
      if (selectedCategory && selectedCategory !== "all") params.append('category', selectedCategory)
      if (selectedCurrency && selectedCurrency !== "all") params.append('currency', selectedCurrency)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const response = await fetch(`/api/expenses?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch expenses')
      }
      const data = await response.json()
      // Ensure we always set an array
      setExpenses(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch expenses",
        variant: "destructive",
      })
    }
  }, [selectedCompany, selectedUser, selectedCategory, selectedCurrency, dateFrom, dateTo, toast])

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (!response.ok) {
        throw new Error('Failed to fetch companies')
      }
      const data = await response.json()
      setCompanies(Array.isArray(data) ? data : [])
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch companies",
        variant: "destructive",
      })
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (!response.ok) {
        throw new Error('Failed to fetch users')
      }
      const data = await response.json()
      setUsers(Array.isArray(data) ? data : [])
      // Set first user as current user for demo purposes
      if (Array.isArray(data) && data.length > 0) {
        setCurrentUserId(data[0].id)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      await Promise.all([fetchExpenses(), fetchCompanies(), fetchUsers()])
      setLoading(false)
    }
    fetchData()
  }, [fetchExpenses])

  const clearFilters = () => {
    setSelectedCompany("all")
    setSelectedUser("all")
    setSelectedCategory("all")
    setSelectedCurrency("all")
    setDateFrom("")
    setDateTo("")
  }

  // Safe calculations with proper checks
  const totalExpensesSRD = Array.isArray(expenses) 
    ? expenses.filter(e => e.currency === "SRD").reduce((sum, e) => sum + e.amount, 0)
    : 0

  const totalExpensesUSD = Array.isArray(expenses)
    ? expenses.filter(e => e.currency === "USD").reduce((sum, e) => sum + e.amount, 0)
    : 0

  const totalExpensesInSRD = totalExpensesSRD + (totalExpensesUSD * 40) // Convert USD to SRD

  // Currency formatting function
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

  const expenseCategories = [
    { value: "DINNER", label: "Dinner" },
    { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
    { value: "TRANSPORTATION", label: "Transportation" },
    { value: "UTILITIES", label: "Utilities" },
    { value: "MARKETING", label: "Marketing" },
    { value: "MAINTENANCE", label: "Maintenance" },
    { value: "MISCELLANEOUS", label: "Miscellaneous" },
  ]

  const currencies = [
    { value: "SRD", label: "SRD" },
    { value: "USD", label: "USD" },
  ]

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage business expenses across companies
          </p>
        </div>
        <ExpenseFormDialog
          companies={companies}
          currentUserId={currentUserId}
          onSuccess={fetchExpenses}
        />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (SRD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpensesSRD, "SRD")}</div>
            <p className="text-xs text-muted-foreground">In Surinamese Dollars</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpensesUSD, "USD")}</div>
            <p className="text-xs text-muted-foreground">In US Dollars</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Combined Total</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalExpensesInSRD, "SRD")}</div>
            <p className="text-xs text-muted-foreground">All expenses in SRD (1 USD = 40 SRD)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expenses.length}</div>
            <p className="text-xs text-muted-foreground">Expense records</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>
            Filter expenses by company, user, category, currency, and date range
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <div className="space-y-2">
              <Label>Company</Label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="All companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>User</Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {expenseCategories.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
                <SelectTrigger>
                  <SelectValue placeholder="All currencies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All currencies</SelectItem>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>From Date</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>
          
          {(selectedCompany && selectedCompany !== "all" || selectedUser && selectedUser !== "all" || selectedCategory && selectedCategory !== "all" || selectedCurrency && selectedCurrency !== "all" || dateFrom || dateTo) && (
            <div className="mt-4">
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense Records</CardTitle>
          <CardDescription>
            Manage and track all business expenses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExpenseDataTable
            expenses={expenses}
            companies={companies}
            currentUserId={currentUserId}
            onUpdate={fetchExpenses}
          />
        </CardContent>
      </Card>
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