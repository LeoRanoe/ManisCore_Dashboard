"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, X, DollarSign, TrendingUp, Package2, Settings, MapPin, ShoppingCart } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SimpleItemDataTable } from "@/components/inventory/simple-item-data-table"
import { ItemFormDialog } from "@/components/inventory/item-form-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useItems } from "@/lib/hooks"
import { useCompany } from "../../../contexts/company-context"
import Link from "next/link"

interface Item {
  id: string
  name: string
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  quantityInStock: number
  costPerUnitUSD: number
  freightCostUSD: number
  sellingPriceSRD: number
  notes?: string
  totalCostPerUnitUSD: number
  profitPerUnitSRD: number
  totalProfitSRD: number
  companyId: string
  assignedUserId?: string
  locationId?: string
  company: {
    id: string
    name: string
  }
  assignedUser?: {
    id: string
    name: string
    email: string
  }
  location?: {
    id: string
    name: string
  }
  createdAt: string
}

interface Company {
  id: string
  name: string
  cashBalanceUSD?: number
}

interface User {
  id: string
  name: string
  email: string
  companyId: string
}

interface Location {
  id: string
  name: string
  companyId: string
}

function InventoryPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>()
  const { toast } = useToast()
  
  // Use dynamic hooks for automatic company filtering and error handling
  const { 
    data: itemsData, 
    loading: itemsLoading, 
    error: itemsError,
    refresh: refreshItems 
  } = useItems(searchQuery, statusFilter)

  const { selectedCompany, companies, loading: companyLoading } = useCompany()

  const items = itemsData?.items || []
  const loading = itemsLoading || companyLoading

  const fetchItems = useCallback(async () => {
    // This is now handled by the useItems hook
    refreshItems()
  }, [refreshItems])

  const fetchCompanies = useCallback(async () => {
    // This is now handled by the useCompany context
  }, [])

  useEffect(() => {
    // Data is automatically fetched by hooks
  }, [])

  const handleSort = (field: string) => {
    // Sorting can be implemented in the table component or via API params
    console.log("Sort by:", field)
  }

  const handleEdit = (item: Item) => {
    setEditingItem(item)
    setIsFormOpen(true)
  }

  const handleDelete = async (itemId: string) => {
    try {
      const response = await fetch(`/api/items/${itemId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete item')
      }

      // Refresh the items list
      refreshItems()
      
      toast({
        title: "Success",
        description: "Item deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting item:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete item",
        variant: "destructive",
      })
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingItem(undefined)
  }

  const clearFilters = () => {
    setSearchQuery("")
    setStatusFilter("all")
  }

  const hasActiveFilters = searchQuery || 
    (statusFilter && statusFilter !== "all") ||
    (selectedCompany && selectedCompany !== "all")

  // Calculate inventory metrics
  const inventoryMetrics = items.reduce((acc, item) => {
    const freightPerUnitUSD = item.quantityInStock > 0 ? item.freightCostUSD / item.quantityInStock : 0
    const totalCostPerUnitUSD = item.costPerUnitUSD + freightPerUnitUSD
    const usdToSrdRate = 40
    const totalCostPerUnitSRD = totalCostPerUnitUSD * usdToSrdRate
    const profitPerUnitSRD = item.sellingPriceSRD - totalCostPerUnitSRD
    const totalProfitSRD = profitPerUnitSRD * item.quantityInStock
    const totalValueSRD = item.sellingPriceSRD * item.quantityInStock
    const totalCostSRD = totalCostPerUnitSRD * item.quantityInStock

    return {
      totalItems: acc.totalItems + item.quantityInStock,
      totalValueSRD: acc.totalValueSRD + totalValueSRD,
      totalCostSRD: acc.totalCostSRD + totalCostSRD,
      totalProfitSRD: acc.totalProfitSRD + totalProfitSRD,
    }
  }, { totalItems: 0, totalValueSRD: 0, totalCostSRD: 0, totalProfitSRD: 0 })

  const profitMargin = inventoryMetrics.totalValueSRD > 0 
    ? ((inventoryMetrics.totalProfitSRD / inventoryMetrics.totalValueSRD) * 100) 
    : 0

  // Calculate status breakdown
  const statusCounts = items.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const toOrderCount = statusCounts['ToOrder'] || 0
  const orderedCount = statusCounts['Ordered'] || 0
  const arrivedCount = statusCounts['Arrived'] || 0
  const soldCount = statusCounts['Sold'] || 0

  // Error state
  if (itemsError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Overview</h1>
            <p className="text-muted-foreground">
              View your inventory items and basic metrics.
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading inventory: {itemsError}</p>
          <Button onClick={refreshItems}>Retry</Button>
        </div>
      </div>
    )
  }

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72 mt-2" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Inventory Overview</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            View your inventory items and basic metrics. Use quick actions to access detailed management.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial">
            <Link href="/inventory/stock">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Manage Stock</span>
              <span className="sm:hidden">Stock</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial">
            <Link href="/inventory/locations">
              <MapPin className="h-4 w-4" />
              <span className="hidden sm:inline">Locations</span>
              <span className="sm:hidden">Locations</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="gap-2 flex-1 sm:flex-initial">
            <Link href="/inventory/orders">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">Orders</span>
              <span className="sm:hidden">Orders</span>
            </Link>
          </Button>
          <Button onClick={() => setIsFormOpen(true)} size="sm" className="gap-2 flex-1 sm:flex-initial">
            <Plus className="h-4 w-4" />
            Add Item
          </Button>
        </div>
      </div>

      {/* Inventory Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inventoryMetrics.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Items in inventory
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SRD {inventoryMetrics.totalValueSRD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              At selling price
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SRD {inventoryMetrics.totalCostSRD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Including freight
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${inventoryMetrics.totalProfitSRD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              SRD {inventoryMetrics.totalProfitSRD.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {profitMargin.toFixed(1)}% margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 dark:border-blue-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Order</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">{toOrderCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{toOrderCount}</div>
            <p className="text-xs text-muted-foreground">
              Items to be ordered
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-yellow-200 dark:border-yellow-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <div className="h-8 w-8 rounded-full bg-yellow-100 dark:bg-yellow-900 flex items-center justify-center">
              <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">{orderedCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{orderedCount}</div>
            <p className="text-xs text-muted-foreground">
              Items currently ordered
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-green-200 dark:border-green-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrived</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
              <span className="text-xs font-semibold text-green-700 dark:text-green-300">{arrivedCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{arrivedCount}</div>
            <p className="text-xs text-muted-foreground">
              Items in stock
            </p>
          </CardContent>
        </Card>
        
        <Card className="border-purple-200 dark:border-purple-900">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
              <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{soldCount}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{soldCount}</div>
            <p className="text-xs text-muted-foreground">
              Items sold
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Simplified Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search items by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Basic Filters */}
        <div className="flex gap-3 flex-wrap items-center">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ToOrder">To Order</SelectItem>
              <SelectItem value="Ordered">Ordered</SelectItem>
              <SelectItem value="Arrived">Arrived</SelectItem>
              <SelectItem value="Sold">Sold</SelectItem>
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button 
              variant="outline" 
              onClick={clearFilters} 
              size="sm"
              className="gap-2 w-full sm:w-auto"
            >
              <X className="h-4 w-4" />
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      <SimpleItemDataTable
        items={items}
        onSort={handleSort}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <ItemFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        item={editingItem}
        companies={companies}
        onSuccess={refreshItems}
      />
    </div>
  )
}

// Wrap with DashboardLayout
export default function InventoryPageWithLayout() {
  return (
    <DashboardLayout>
      <InventoryPage />
    </DashboardLayout>
  )
}