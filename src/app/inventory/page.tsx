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
    const usdToSrdRate = 3.75
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

  // Error state
  if (itemsError) {
    return (
      <div className="space-y-6">
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
      <div className="space-y-6">
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
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Inventory Overview</h1>
            <p className="text-muted-foreground">
              View your inventory items and basic metrics. Use quick actions to access detailed management.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
            <Link href="/inventory/stock">
              <Button variant="outline">
                <Package2 className="mr-2 h-4 w-4" /> Manage Stock
              </Button>
            </Link>
            <Link href="/inventory/locations">
              <Button variant="outline">
                <MapPin className="mr-2 h-4 w-4" /> Locations
              </Button>
            </Link>
            <Link href="/inventory/orders">
              <Button variant="outline">
                <ShoppingCart className="mr-2 h-4 w-4" /> Orders
              </Button>
            </Link>
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
          <div className="flex gap-3 flex-wrap">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
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
                className="gap-2"
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
        />

        <ItemFormDialog
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          item={editingItem}
          companies={companies || []}
          onSuccess={() => {
            handleCloseForm()
            refreshItems()
          }}
        />
      </div>
    </DashboardLayout>
  )
}

export default InventoryPage