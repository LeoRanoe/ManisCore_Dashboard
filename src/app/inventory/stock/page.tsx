"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Package, Plus, Minus, Search, Filter, MapPin } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  batchCount?: number
  locationCount?: number
  batchLocations?: Array<{ id: string; name: string }>
  hasMultipleLocations?: boolean
  createdAt: string
}

interface Location {
  id: string
  name: string
  companyId: string
}

interface User {
  id: string
  name: string
  email: string
  companyId: string
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
  const [selectedLocationId, setSelectedLocationId] = useState<string>("none")
  const [selectedUserId, setSelectedUserId] = useState<string>("none")
  const [processing, setProcessing] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [users, setUsers] = useState<User[]>([])
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

  // Fetch locations and users
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locationsRes, usersRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/users')
        ])
        
        if (locationsRes.ok) {
          const locationsData = await locationsRes.json()
          setLocations(locationsData.locations || [])
        }
        
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }
      } catch (error) {
        console.error('Error fetching locations/users:', error)
      }
    }
    
    fetchData()
  }, [])

  // Error state
  if (itemsError) {
    return (
      <div className="space-y-6 p-6">
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
      const endpoint = "/api/inventory/actions"
      let body: any = {
        action: stockAction,
        itemId: selectedItem.id,
      }

      switch (stockAction) {
        case "add":
          body.quantityToAdd = quantity
          body.reason = reason
          break
        case "remove":
          body.quantityToRemove = quantity
          body.reason = reason
          break
        case "sell":
          body.quantityToSell = quantity
          body.sellingPriceSRD = sellPrice
          body.locationId = (selectedLocationId && selectedLocationId !== "none") ? selectedLocationId : undefined
          body.assignedUserId = (selectedUserId && selectedUserId !== "none") ? selectedUserId : undefined
          break
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `Failed to ${stockAction} stock`)
      }

      const result = await response.json()
      
      toast({
        title: "Success",
        description: result.message || `Successfully ${stockAction === "add" ? "added" : stockAction === "remove" ? "removed" : "sold"} ${quantity} units`,
      })

      // Refresh items and close dialog
      refreshItems()
      closeDialog()
    } catch (error) {
      console.error(`Error ${stockAction} stock:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${stockAction} stock`,
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
    setSelectedLocationId(item.locationId || "none")
    setSelectedUserId(item.assignedUserId || "none")
  }

  const closeDialog = () => {
    setSelectedItem(null)
    setStockAction(null)
    setQuantity(1)
    setSellPrice(0)
    setReason("")
    setSelectedLocationId("none")
    setSelectedUserId("none")
  }

  return (
    <div className="space-y-6 p-6">
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
                      {item.batchCount && item.batchCount > 0 && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.batchCount} batches
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.hasMultipleLocations ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-500" />
                          <Badge variant="outline" className="text-xs">
                            {item.locationCount} locations
                          </Badge>
                        </div>
                      ) : item.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-blue-500" />
                          {item.location.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No location</span>
                      )}
                    </TableCell>
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
              <>
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
                  <p className="text-sm text-muted-foreground mt-1">
                    Total revenue: SRD {(sellPrice * quantity).toFixed(2)}
                  </p>
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Select
                    value={selectedLocationId || "none"}
                    onValueChange={(value) => setSelectedLocationId(value === "none" ? "" : value)}
                  >
                    <SelectTrigger id="location">
                      <SelectValue placeholder="Select location (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No location</SelectItem>
                      {selectedItem && locations
                        .filter(loc => loc.companyId === selectedItem.companyId)
                        .map(location => (
                          <SelectItem key={location.id} value={location.id}>
                            {location.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track which location this sale is from
                  </p>
                </div>

                <div>
                  <Label htmlFor="user">Sold By</Label>
                  <Select
                    value={selectedUserId || "none"}
                    onValueChange={(value) => setSelectedUserId(value === "none" ? "" : value)}
                  >
                    <SelectTrigger id="user">
                      <SelectValue placeholder="Select user (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not specified</SelectItem>
                      {selectedItem && users
                        .filter(user => user.companyId === selectedItem.companyId)
                        .map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-1">
                    Track who made this sale
                  </p>
                </div>
              </>
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