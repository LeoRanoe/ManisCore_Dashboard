"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useCompany } from "../../../contexts/company-context"
import { 
  DollarSign, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Edit,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { CompanyFinancialDialog } from "@/components/companies/company-financial-dialog"

interface FinancialData {
  cashBalanceSRD: number
  cashBalanceUSD: number
  stockValueSRD: number
  stockValueUSD: number
  totalValueSRD: number
  totalValueUSD: number
}

interface Expense {
  id: string
  description: string
  amount: number
  currency: string
  date: string
  category: string
  companyId: string
}

function FinancialPage() {
  const { selectedCompany } = useCompany()
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [isFinancialDialogOpen, setIsFinancialDialogOpen] = useState(false)
  const { toast } = useToast()

  const fetchFinancialData = async () => {
    if (!selectedCompany || selectedCompany === "all") return

    setLoading(true)
    try {
      // Fetch financial data
      const financialResponse = await fetch(`/api/companies/${selectedCompany}/financial`)
      if (financialResponse.ok) {
        const data = await financialResponse.json()
        setFinancialData(data)
      }

      // Fetch recent expenses
      const expensesResponse = await fetch(`/api/expenses?companyId=${selectedCompany}&limit=10`)
      if (expensesResponse.ok) {
        const expensesData = await expensesResponse.json()
        setExpenses(expensesData.expenses || [])
      }
    } catch (error) {
      console.error("Error fetching financial data:", error)
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinancialData()
  }, [selectedCompany])

  const handleRefresh = () => {
    fetchFinancialData()
  }

  if (!selectedCompany || selectedCompany === "all") {
    return (
      <div className="space-y-6 p-4 md:p-6">
        <div className="flex items-center justify-center h-[400px]">
          <div className="text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Company Selected</h3>
            <p className="text-muted-foreground">Please select a company to view financial data</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your company's finances, cash flow, and expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setIsFinancialDialogOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            Update Cash Balance
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Financial Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Cash Balance SRD */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance (SRD)</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  SRD {financialData?.cashBalanceSRD.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available liquid cash</p>
              </CardContent>
            </Card>

            {/* Cash Balance USD */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cash Balance (USD)</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${financialData?.cashBalanceUSD.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Available liquid cash</p>
              </CardContent>
            </Card>

            {/* Stock Value SRD */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Value (SRD)</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  SRD {financialData?.stockValueSRD.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Inventory value</p>
              </CardContent>
            </Card>

            {/* Total Value */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Assets (SRD)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  SRD {financialData?.totalValueSRD.toFixed(2) || "0.00"}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Cash + Stock value</p>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Financial Info */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Cash Flow Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Cash Flow Summary</CardTitle>
                <CardDescription>Current liquidity status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">SRD Cash</span>
                    <span className="text-lg font-bold">
                      SRD {financialData?.cashBalanceSRD.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">USD Cash</span>
                    <span className="text-lg font-bold">
                      ${financialData?.cashBalanceUSD.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-medium">USD in SRD (@ 40)</span>
                    <span className="text-lg font-bold text-muted-foreground">
                      SRD {((financialData?.cashBalanceUSD || 0) * 40).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-semibold">Total Cash (SRD)</span>
                    <span className="text-xl font-bold text-green-600">
                      SRD {((financialData?.cashBalanceSRD || 0) + (financialData?.cashBalanceUSD || 0) * 40).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Asset Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Asset Breakdown</CardTitle>
                <CardDescription>Distribution of company assets</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">Liquid Cash</span>
                    </div>
                    <span className="text-lg font-bold">
                      SRD {((financialData?.cashBalanceSRD || 0) + (financialData?.cashBalanceUSD || 0) * 40).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-600" />
                      <span className="text-sm font-medium">Inventory Stock</span>
                    </div>
                    <span className="text-lg font-bold">
                      SRD {(financialData?.stockValueSRD || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t">
                    <span className="text-sm font-semibold">Total Assets</span>
                    <span className="text-xl font-bold text-green-600">
                      SRD {(financialData?.totalValueSRD || 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-2">
                    {financialData?.totalValueSRD && financialData.totalValueSRD > 0
                      ? `${(((financialData.cashBalanceSRD + financialData.cashBalanceUSD * 40) / financialData.totalValueSRD) * 100).toFixed(1)}% liquid`
                      : "0% liquid"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Expenses */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Last 10 transactions</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/expenses'}>
                  View All
                  <ArrowUpRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingDown className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No expenses recorded yet</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => {
                        // Check if this is a sale/income record
                        const isIncome = expense.description.startsWith('Sale of')
                        
                        return (
                          <TableRow key={expense.id}>
                            <TableCell className="font-medium">{expense.description}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{expense.category}</Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(expense.date).toLocaleDateString()}
                            </TableCell>
                            <TableCell className={`text-right font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                              <div className="flex items-center justify-end gap-1">
                                {isIncome ? (
                                  <ArrowUpRight className="h-3 w-3" />
                                ) : (
                                  <ArrowDownRight className="h-3 w-3" />
                                )}
                                {expense.currency} {isIncome ? '+' : '-'}{Math.abs(expense.amount).toFixed(2)}
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Financial Dialog */}
      {selectedCompany && (
        <CompanyFinancialDialog
          isOpen={isFinancialDialogOpen}
          onClose={() => setIsFinancialDialogOpen(false)}
          company={{ id: selectedCompany, name: "Current Company" }}
          onSuccess={handleRefresh}
        />
      )}
    </div>
  )
}

// Wrap with DashboardLayout
export default function FinancialPageWithLayout() {
  return (
    <DashboardLayout>
      <FinancialPage />
    </DashboardLayout>
  )
}
