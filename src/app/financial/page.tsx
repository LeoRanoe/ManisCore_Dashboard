"use client"

import { useEffect, useState } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { DollarSign, TrendingUp, Coins, Package } from "lucide-react"

interface Company {
  id: string
  name: string
  cashBalanceSRD: number
  cashBalanceUSD: number
  stockValueSRD: number
  stockValueUSD: number
  totalValueSRD?: number
  totalValueUSD?: number
  exchangeRate?: number
}

function CompanyFinancialManagementPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/companies')
      if (!response.ok) {
        throw new Error('Failed to fetch companies')
      }
      const data = await response.json()
      
      // Fetch financial data for each company
      const companiesWithFinancials = await Promise.all(
        data.map(async (company: any) => {
          try {
            const financialResponse = await fetch(`/api/companies/${company.id}/financial`)
            if (financialResponse.ok) {
              const financialData = await financialResponse.json()
              return { ...company, ...financialData }
            }
            return {
              ...company,
              cashBalanceSRD: 0,
              cashBalanceUSD: 0,
              stockValueSRD: 0,
              stockValueUSD: 0,
              totalValueSRD: 0,
              totalValueUSD: 0,
              exchangeRate: 40,
            }
          } catch (error) {
            console.error(`Error fetching financial data for ${company.name}:`, error)
            return {
              ...company,
              cashBalanceSRD: 0,
              cashBalanceUSD: 0,
              stockValueSRD: 0,
              stockValueUSD: 0,
              totalValueSRD: 0,
              totalValueUSD: 0,
              exchangeRate: 40,
            }
          }
        })
      )
      
      setCompanies(companiesWithFinancials)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch company data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const updateCompanyFinancials = async (companyId: string, financialData: any) => {
    setSaving(companyId)
    try {
      const response = await fetch(`/api/companies/${companyId}/financial`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(financialData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update financial data')
      }

      const updatedData = await response.json()
      
      setCompanies(prev => prev.map(company => 
        company.id === companyId 
          ? { ...company, ...updatedData }
          : company
      ))

      toast({
        title: "Financial data updated",
        description: "Company financial information has been saved successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update financial data",
        variant: "destructive",
      })
    } finally {
      setSaving(null)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-96 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Financial Management</h1>
          <p className="text-muted-foreground">
            Manage company cash balances and stock values in SRD and USD
          </p>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash (SRD)</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              SRD {companies.reduce((sum, c) => sum + c.cashBalanceSRD, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All companies combined</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash (USD)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${companies.reduce((sum, c) => sum + c.cashBalanceUSD, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All companies combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stock Value (SRD)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              SRD {companies.reduce((sum, c) => sum + c.stockValueSRD, 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">All companies combined</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Combined Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              SRD {companies.reduce((sum, c) => sum + (c.totalValueSRD || 0), 0).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Cash + Stock (1 USD = 40 SRD)</p>
          </CardContent>
        </Card>
      </div>

      {/* Company Financial Management */}
      <div className="grid gap-6 md:grid-cols-2">
        {companies.map((company) => (
          <CompanyFinancialCard
            key={company.id}
            company={company}
            onUpdate={(financialData) => updateCompanyFinancials(company.id, financialData)}
            isSaving={saving === company.id}
          />
        ))}
      </div>
    </div>
  )
}

interface CompanyFinancialCardProps {
  company: Company
  onUpdate: (financialData: any) => void
  isSaving: boolean
}

function CompanyFinancialCard({ company, onUpdate, isSaving }: CompanyFinancialCardProps) {
  const [cashBalanceSRD, setCashBalanceSRD] = useState(company.cashBalanceSRD)
  const [cashBalanceUSD, setCashBalanceUSD] = useState(company.cashBalanceUSD)
  const [stockValueSRD, setStockValueSRD] = useState(company.stockValueSRD)
  const [stockValueUSD, setStockValueUSD] = useState(company.stockValueUSD)

  useEffect(() => {
    setCashBalanceSRD(company.cashBalanceSRD)
    setCashBalanceUSD(company.cashBalanceUSD)
    setStockValueSRD(company.stockValueSRD)
    setStockValueUSD(company.stockValueUSD)
  }, [company])

  const handleSave = () => {
    onUpdate({
      cashBalanceSRD,
      cashBalanceUSD,
      stockValueSRD,
      stockValueUSD,
    })
  }

  const hasChanges = 
    cashBalanceSRD !== company.cashBalanceSRD ||
    cashBalanceUSD !== company.cashBalanceUSD ||
    stockValueSRD !== company.stockValueSRD ||
    stockValueUSD !== company.stockValueUSD

  const totalSRD = cashBalanceSRD + stockValueSRD
  const totalUSD = cashBalanceUSD + stockValueUSD
  const combinedTotalSRD = totalSRD + (totalUSD * 40)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {company.name}
        </CardTitle>
        <CardDescription>
          Manage cash balances and stock values for this company
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cash Management */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Coins className="h-4 w-4" />
            Cash Balances
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`cash-srd-${company.id}`}>Cash (SRD)</Label>
              <Input
                id={`cash-srd-${company.id}`}
                type="number"
                step="0.01"
                min="0"
                value={cashBalanceSRD}
                onChange={(e) => setCashBalanceSRD(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`cash-usd-${company.id}`}>Cash (USD)</Label>
              <Input
                id={`cash-usd-${company.id}`}
                type="number"
                step="0.01"
                min="0"
                value={cashBalanceUSD}
                onChange={(e) => setCashBalanceUSD(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Stock Value Management */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Package className="h-4 w-4" />
            Stock Values
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`stock-srd-${company.id}`}>Stock Value (SRD)</Label>
              <Input
                id={`stock-srd-${company.id}`}
                type="number"
                step="0.01"
                min="0"
                value={stockValueSRD}
                onChange={(e) => setStockValueSRD(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`stock-usd-${company.id}`}>Stock Value (USD)</Label>
              <Input
                id={`stock-usd-${company.id}`}
                type="number"
                step="0.01"
                min="0"
                value={stockValueUSD}
                onChange={(e) => setStockValueUSD(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h5 className="font-medium">Financial Summary</h5>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total SRD:</p>
              <p className="font-semibold">SRD {totalSRD.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total USD:</p>
              <p className="font-semibold">${totalUSD.toFixed(2)}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Combined Total (SRD):</p>
              <p className="font-bold text-lg">SRD {combinedTotalSRD.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Exchange Rate: 1 USD = 40 SRD</p>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <Button 
          onClick={handleSave} 
          disabled={!hasChanges || isSaving}
          className="w-full"
        >
          {isSaving ? "Saving..." : "Save Financial Data"}
        </Button>
      </CardContent>
    </Card>
  )
}

export default function FinancialPageWithLayout() {
  return (
    <DashboardLayout>
      <CompanyFinancialManagementPage />
    </DashboardLayout>
  )
}