"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, MapPin, Search, Package, Move } from "lucide-react"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useItems, useLocations } from "@/lib/hooks"
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
  supplier?: string | null
  supplierSku?: string | null
  orderDate?: string | null
  expectedArrival?: string | null
  orderNumber?: string | null
  profitMarginPercent?: number | null
  minStockLevel?: number | null
  notes?: string | null
  companyId: string
  assignedUserId?: string | null
  locationId?: string | null
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

interface Location {
  id: string
  name: string
  companyId: string
}

const statusConfig = {
  ToOrder: { label: "To Order", variant: "secondary" as const },
  Ordered: { label: "Ordered", variant: "warning" as const },
  Arrived: { label: "Arrived", variant: "success" as const },
  Sold: { label: "Sold", variant: "default" as const },
}

function LocationManagementPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [locationFilter, setLocationFilter] = useState<string>("all")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [targetLocationId, setTargetLocationId] = useState<string>("")
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  // Use dynamic hooks for automatic company filtering and error handling
  const { 
    data: itemsData, 
    loading: itemsLoading, 
    error: itemsError,
    refresh: refreshItems 
  } = useItems(searchQuery)

  const { 
    data: locationsData, 
    loading: locationsLoading 
  } = useLocations()

  const { selectedCompany } = useCompany()

  const items = itemsData?.items || []
  const locations = locationsData?.locations || []
  const loading = itemsLoading || locationsLoading

  const handleMoveItem = async () => {
    if (!selectedItem) return

    setProcessing(true)
    try {
      const targetLocation = locations.find(l => l.id === targetLocationId)
      const newNotes = targetLocationId 
        ? `${selectedItem.notes || ""}\n[${new Date().toLocaleDateString()}] Moved to ${targetLocation?.name}`.trim()
        : `${selectedItem.notes || ""}\n[${new Date().toLocaleDateString()}] Removed from location`.trim()

      // Include ALL fields from the item to preserve data
      const updateData: any = {
        name: selectedItem.name,
        status: selectedItem.status,
        quantityInStock: selectedItem.quantityInStock,
        costPerUnitUSD: selectedItem.costPerUnitUSD,
        freightCostUSD: selectedItem.freightCostUSD,
        sellingPriceSRD: selectedItem.sellingPriceSRD,
        companyId: selectedItem.companyId,
      }

      // Add optional fields only if they have valid values (not null, undefined, or empty string)
      if (selectedItem.supplier && selectedItem.supplier.trim().length > 0) {
        updateData.supplier = selectedItem.supplier.trim()
      }
      if (selectedItem.supplierSku && selectedItem.supplierSku.trim().length > 0) {
        updateData.supplierSku = selectedItem.supplierSku.trim()
      }
      if (selectedItem.orderDate && selectedItem.orderDate.trim().length > 0) {
        updateData.orderDate = selectedItem.orderDate.trim()
      }
      if (selectedItem.expectedArrival && selectedItem.expectedArrival.trim().length > 0) {
        updateData.expectedArrival = selectedItem.expectedArrival.trim()
      }
      if (selectedItem.orderNumber && selectedItem.orderNumber.trim().length > 0) {
        updateData.orderNumber = selectedItem.orderNumber.trim()
      }
      if (selectedItem.profitMarginPercent !== null && selectedItem.profitMarginPercent !== undefined) {
        updateData.profitMarginPercent = selectedItem.profitMarginPercent
      }
      if (selectedItem.minStockLevel !== null && selectedItem.minStockLevel !== undefined) {
        updateData.minStockLevel = selectedItem.minStockLevel
      }
      if (newNotes && newNotes.trim().length > 0) {
        updateData.notes = newNotes.trim()
      }
      if (selectedItem.assignedUserId && selectedItem.assignedUserId.trim().length > 0) {
        updateData.assignedUserId = selectedItem.assignedUserId.trim()
      }
      if (targetLocationId && targetLocationId.trim().length > 0) {
        updateData.locationId = targetLocationId.trim()
      }

      console.log('Sending move update:', JSON.stringify(updateData, null, 2))

      const response = await fetch(`/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || errorData.message || "Failed to move item")
      }

      toast({
        title: "Success",
        description: targetLocationId 
          ? `Item moved to ${targetLocation?.name}`
          : "Item removed from location",
      })

      // Refresh items and close dialog
      refreshItems()
      closeMoveDialog()
    } catch (error) {
      console.error("Error moving item:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to move item",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const openMoveDialog = (item: Item) => {
    setSelectedItem(item)
    setTargetLocationId(item.locationId || "")
    setMoveDialogOpen(true)
  }

  const closeMoveDialog = () => {
    setSelectedItem(null)
    setTargetLocationId("")
    setMoveDialogOpen(false)
  }

  // Group items by location for better organization
  const itemsByLocation = items.reduce((acc: Record<string, { name: string; items: any[] }>, item: any) => {
    const locationKey = item.location?.id || "unassigned"
    const locationName = item.location?.name || "Unassigned"
    
    if (!acc[locationKey]) {
      acc[locationKey] = {
        name: locationName,
        items: []
      }
    }
    acc[locationKey].items.push(item)
    return acc
  }, {})

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
              <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
              <p className="text-muted-foreground">
                Manage item locations and track inventory across different storage areas.
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
            <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
            <p className="text-muted-foreground">
              Manage item locations and track inventory across different storage areas.
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="unassigned">Unassigned</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Location Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Object.entries(itemsByLocation).map(([locationId, locationData]) => (
          <Card key={locationId}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {locationData.name}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locationData.items.length}</div>
              <p className="text-xs text-muted-foreground">
                {locationData.items.reduce((total, item) => total + item.quantityInStock, 0)} total units
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Items Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Current Location</TableHead>
                <TableHead>Company</TableHead>
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
                    <TableCell>{item.quantityInStock} units</TableCell>
                    <TableCell>
                      {item.location ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell>{item.company.name}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openMoveDialog(item)}
                        className="gap-1"
                      >
                        <Move className="h-3 w-3" />
                        Move
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Move Item Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={closeMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Item - {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Select a new location for this item or remove it from any location.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="location">Target Location</Label>
              <Select value={targetLocationId} onValueChange={setTargetLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location or leave unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Location (Unassigned)</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedItem?.location && (
                <p className="text-sm text-muted-foreground mt-1">
                  Current location: {selectedItem.location.name}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeMoveDialog}>
              Cancel
            </Button>
            <Button onClick={handleMoveItem} disabled={processing}>
              {processing ? "Moving..." : "Move Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrap with DashboardLayout
export default function LocationManagementPageWithLayout() {
  return (
    <DashboardLayout>
      <LocationManagementPage />
    </DashboardLayout>
  )
}