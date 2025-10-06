"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Filter, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemDataTable } from "@/components/inventory/item-data-table"
import { ItemFormDialog } from "@/components/inventory/item-form-dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface Item {
  id: string
  name: string
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  quantityInStock: number
  costPerUnitUSD: number
  freightPerUnitUSD: number
  sellingPriceSRD: number
  totalCostPerUnitUSD: number
  profitPerUnitSRD: number
  totalProfitSRD: number
  companyId: string
  company: {
    name: string
  }
  createdAt: string
}

interface Company {
  id: string
  name: string
}

export default function InventoryPage() {
  const [items, setItems] = useState<Item[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("")
  const [sortBy, setSortBy] = useState("createdAt")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>()

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        sortBy,
        order: sortOrder,
        ...(searchQuery && { searchQuery }),
        ...(statusFilter && { status: statusFilter }),
      })

      const response = await fetch(`/api/items?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch items")
      }
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error("Error fetching items:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, statusFilter, sortBy, sortOrder])

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch("/api/companies")
      if (!response.ok) {
        throw new Error("Failed to fetch companies")
      }
      const data = await response.json()
      setCompanies(data.companies || [])
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }, [])

  useEffect(() => {
    fetchItems()
    fetchCompanies()
  }, [fetchItems, fetchCompanies])

  const handleSort = (field: string) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(field)
      setSortOrder("asc")
    }
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
    setStatusFilter("")
    setSortBy("createdAt")
    setSortOrder("desc")
  }

  const hasActiveFilters = searchQuery || statusFilter

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Inventory Management</h1>
          <p className="text-muted-foreground">
            Manage your inventory items, track stock levels, and monitor profitability.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add New Item
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Status</SelectItem>
            <SelectItem value="ToOrder">To Order</SelectItem>
            <SelectItem value="Ordered">Ordered</SelectItem>
            <SelectItem value="Arrived">Arrived</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Clear
          </Button>
        )}
      </div>

      <ItemDataTable
        items={items}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSort={handleSort}
        onEdit={handleEdit}
        onRefresh={fetchItems}
      />

      <ItemFormDialog
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        item={editingItem}
        companies={companies}
        onSuccess={fetchItems}
      />
    </div>
  )
}