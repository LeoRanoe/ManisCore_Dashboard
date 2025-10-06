"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Package, Plus, Minus, Search, Filter } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useItems } from "@/lib/hooks"
import { useCompany } from "../../../../contexts/company-context"
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

const statusConfig = {
  ToOrder: { label: "To Order", variant: "secondary" as const },
  Ordered: { label: "Ordered", variant: "warning" as const },
  Arrived: { label: "Arrived", variant: "success" as const },
  Sold: { label: "Sold", variant: "default" as const },
}

function StockManagementPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [stockAction, setStockAction] = useState<"add" | "remove" | "sell" | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(0)
  const [reason, setReason] = useState("")
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  // Use dynamic hooks for automatic company filtering and error handling
  const { 
    data: itemsData, 
    loading, 
    error: itemsError,
    refresh: refreshItems 
  } = useItems(searchQuery)

  const { selectedCompany } = useCompany()
  const items = itemsData?.items || []

  // Error state
  if (itemsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4" />
                Back to Inventory
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
              <p className="text-muted-foreground">
                Add, remove, or sell inventory items with detailed tracking.
              </p>
            </div>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading items: {itemsError}</p>
          <Button onClick={refreshItems}>Retry</Button>
        </div>
      </div>
    )
  }

  const handleStockAction = async () => {
    if (!selectedItem || !stockAction) return

    setProcessing(true)
    try {
      let endpoint = ""
      let body = {}

      switch (stockAction) {
        case "add":
          // Add stock - just update quantity
          endpoint = `/api/items/${selectedItem.id}`
          body = {
            quantityInStock: selectedItem.quantityInStock + quantity,
            notes: reason ? `${selectedItem.notes || ""}\n[${new Date().toLocaleDateString()}] Added ${quantity} units: ${reason}`.trim() : selectedItem.notes
          }
          break
        case "remove":
          // Remove stock
          endpoint = `/api/items/${selectedItem.id}`
          body = {
            quantityInStock: Math.max(0, selectedItem.quantityInStock - quantity),
            notes: reason ? `${selectedItem.notes || ""}\n[${new Date().toLocaleDateString()}] Removed ${quantity} units: ${reason}`.trim() : selectedItem.notes
          }
          break
        case "sell":
          // Sell items - this is more complex and might need a separate endpoint
          endpoint = `/api/items/${selectedItem.id}`
          body = {
            quantityInStock: Math.max(0, selectedItem.quantityInStock - quantity),
            status: selectedItem.quantityInStock - quantity <= 0 ? "Sold" : selectedItem.status,
            notes: `${selectedItem.notes || ""}\n[${new Date().toLocaleDateString()}] Sold ${quantity} units at SRD ${sellPrice} each`.trim()
          }
          break
      }

      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${stockAction} stock`)
      }

      toast({
        title: "Success",
        description: `Successfully ${stockAction === "add" ? "added" : stockAction === "remove" ? "removed" : "sold"} ${quantity} units`,
      })

      // Refresh items and close dialog
      refreshItems()
      closeDialog()
    } catch (error) {
      console.error(`Error ${stockAction} stock:`, error)
      toast({
        title: "Error",
        description: `Failed to ${stockAction} stock`,
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const openStockDialog = (item: Item, action: "add" | "remove" | "sell") => {
    setSelectedItem(item)
    setStockAction(action)
    setQuantity(1)
    setSellPrice(item.sellingPriceSRD)
    setReason("")
  }

  const closeDialog = () => {
    setSelectedItem(null)
    setStockAction(null)
    setQuantity(1)
    setSellPrice(0)
    setReason("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4" />
              Back to Inventory
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Stock Management</h1>
            <p className="text-muted-foreground">
              Add, remove, or sell inventory items with detailed tracking.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search items..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Stock Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Stock</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Selling Price</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    No items found
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[item.status as keyof typeof statusConfig]?.variant || "default"}>
                        {statusConfig[item.status as keyof typeof statusConfig]?.label || item.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className={item.quantityInStock === 0 ? "text-red-600" : ""}>
                        {item.quantityInStock} units
                      </span>
                    </TableCell>
                    <TableCell>{item.location?.name || "No location"}</TableCell>
                    <TableCell>SRD {item.sellingPriceSRD.toFixed(2)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStockDialog(item, "add")}
                          className="gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openStockDialog(item, "remove")}
                          disabled={item.quantityInStock === 0}
                          className="gap-1"
                        >
                          <Minus className="h-3 w-3" />
                          Remove
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => openStockDialog(item, "sell")}
                          disabled={item.quantityInStock === 0}
                          className="gap-1"
                        >
                          Sell
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Stock Action Dialog */}
      <Dialog open={!!selectedItem && !!stockAction} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {stockAction === "add" ? "Add Stock" : stockAction === "remove" ? "Remove Stock" : "Sell Items"} - {selectedItem?.name}
            </DialogTitle>
            <DialogDescription>
              {stockAction === "add" 
                ? "Add inventory items to stock"
                : stockAction === "remove" 
                ? "Remove items from stock (e.g., damaged, expired)"
                : "Record the sale of inventory items"
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                max={stockAction === "remove" || stockAction === "sell" ? selectedItem?.quantityInStock : undefined}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              />
              {selectedItem && (
                <p className="text-sm text-muted-foreground mt-1">
                  Current stock: {selectedItem.quantityInStock} units
                </p>
              )}
            </div>

            {stockAction === "sell" && (
              <div>
                <Label htmlFor="sellPrice">Selling Price (SRD per unit)</Label>
                <Input
                  id="sellPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellPrice}
                  onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                />
              </div>
            )}

            <div>
              <Label htmlFor="reason">
                {stockAction === "sell" ? "Notes (optional)" : "Reason (optional)"}
              </Label>
              <Textarea
                id="reason"
                placeholder={
                  stockAction === "add" 
                    ? "e.g., New shipment arrived" 
                    : stockAction === "remove"
                    ? "e.g., Damaged during transport"
                    : "e.g., Sold to customer X"
                }
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button onClick={handleStockAction} disabled={processing}>
              {processing ? "Processing..." : 
                stockAction === "add" ? "Add Stock" : 
                stockAction === "remove" ? "Remove Stock" : 
                "Record Sale"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrap with DashboardLayout
export default function StockManagementPageWithLayout() {
  return (
    <DashboardLayout>
      <StockManagementPage />
    </DashboardLayout>
  )
}