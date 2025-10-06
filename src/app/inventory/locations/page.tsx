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

      // Send all required fields for the item update
      const updateData = {
        name: selectedItem.name,
        status: selectedItem.status,
        quantityInStock: selectedItem.quantityInStock,
        costPerUnitUSD: selectedItem.costPerUnitUSD,
        freightCostUSD: selectedItem.freightCostUSD,
        sellingPriceSRD: selectedItem.sellingPriceSRD,
        notes: newNotes,
        companyId: selectedItem.companyId,
        assignedUserId: selectedItem.assignedUserId || undefined,
        locationId: targetLocationId || undefined,
      }

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
  const itemsByLocation = items.reduce<Record<string, { name: string; items: Item[] }>>((acc, item) => {
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

  // Filtered and sorted locations
  const filteredLocations = Object.entries(itemsByLocation)
    .filter(([key, locationData]: [string, { name: string; items: Item[] }]) => 
      locationFilter === 'all' || key === locationFilter
    )
    .sort(([keyA, a]: [string, { name: string; items: Item[] }], [keyB, b]: [string, { name: string; items: Item[] }]) => a.name.localeCompare(b.name))

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
    <DashboardLayout>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLocations.map(([locationId, locationData]: [string, { name: string; items: Item[] }]) => {
            const totalUnits = locationData.items.reduce((sum: number, item: Item) => sum + item.quantityInStock, 0)
            
            return (
              <Card key={locationId}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">{locationData.name}</CardTitle>
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{locationData.items.length} <span className="text-sm font-normal text-muted-foreground">item types</span></div>
                  <p className="text-xs text-muted-foreground">
                    {totalUnits} total units
                  </p>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locationData.items.map((item: Item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{item.quantityInStock}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => openMoveDialog(item)}>
                              <Move className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Move Item: {selectedItem?.name}</DialogTitle>
              <DialogDescription>
                Select a new location for this item.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="location" className="text-right">
                  New Location
                </Label>
                <div className="col-span-3">
                  <Select
                    value={targetLocationId}
                    onValueChange={setTargetLocationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">
                        <span className="text-muted-foreground">Remove from location</span>
                      </SelectItem>
                      {locations.map((location) => (
                        <SelectItem key={location.id} value={location.id}>
                          {location.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeMoveDialog} disabled={processing}>
                Cancel
              </Button>
              <Button onClick={handleMoveItem} disabled={processing}>
                {processing ? "Moving..." : "Confirm Move"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

export default LocationManagementPage