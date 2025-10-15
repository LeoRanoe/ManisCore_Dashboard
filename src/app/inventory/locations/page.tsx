"use client"

import { useState, useEffect } from "react"
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
import { useToast } from "@/components/ui/use-toast"
import { useLocations } from "@/lib/hooks"
import { useCompany } from "../../../../contexts/company-context"
import { BatchTransferDialog } from "@/components/inventory/batch-transfer-dialog"
import Link from "next/link"

interface StockBatch {
  id: string
  itemId: string
  locationId?: string | null
  quantity: number
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  costPerUnitUSD: number
  freightCostUSD: number
  orderDate?: string | null
  expectedArrival?: string | null
  arrivedDate?: string | null
  orderNumber?: string | null
  notes?: string | null
  item: {
    id: string
    name: string
    company: {
      id: string
      name: string
    }
  }
  location?: {
    id: string
    name: string
  } | null
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
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const { toast } = useToast()
  const { selectedCompany } = useCompany()

  const {
    data: locationsData,
    loading: locationsLoading,
  } = useLocations()

  const locations = locationsData?.locations || []

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCompany && selectedCompany !== "all") {
        params.append("companyId", selectedCompany)
      }

      const response = await fetch(`/api/batches?${params.toString()}`)
      if (!response.ok) throw new Error("Failed to fetch batches")

      const data = await response.json()
      setBatches(data.batches || [])
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to load batches",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [selectedCompany])

  const openTransferDialog = (batch: StockBatch) => {
    setSelectedBatch(batch)
    setTransferDialogOpen(true)
  }

  const handleTransferSuccess = () => {
    fetchBatches()
  }

  const filteredBatches = batches.filter((batch) => {
    if (locationFilter !== "all") {
      if (locationFilter === "unassigned") {
        if (batch.locationId) return false
      } else {
        if (batch.locationId !== locationFilter) return false
      }
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const itemName = batch.item?.name?.toLowerCase() || ""
      const locationName = batch.location?.name?.toLowerCase() || ""
      if (!itemName.includes(query) && !locationName.includes(query)) {
        return false
      }
    }

    return true
  })

  // Group batches by item to eliminate duplicates
  const itemsMap = new Map<string, {
    itemId: string
    itemName: string
    company: { id: string; name: string }
    totalQuantity: number
    status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
    locations: Array<{ id: string; name: string; quantity: number }>
    batches: StockBatch[]
  }>()

  filteredBatches.forEach(batch => {
    const key = batch.itemId
    if (!itemsMap.has(key)) {
      itemsMap.set(key, {
        itemId: batch.itemId,
        itemName: batch.item.name,
        company: batch.item.company,
        totalQuantity: 0,
        status: batch.status,
        locations: [],
        batches: []
      })
    }

    const itemData = itemsMap.get(key)!
    itemData.totalQuantity += batch.quantity
    itemData.batches.push(batch)

    // Track locations
    if (batch.locationId && batch.location) {
      const existingLoc = itemData.locations.find(l => l.id === batch.locationId)
      if (existingLoc) {
        existingLoc.quantity += batch.quantity
      } else {
        itemData.locations.push({
          id: batch.location.id,
          name: batch.location.name,
          quantity: batch.quantity
        })
      }
    }

    // Update status to most advanced status
    const statusOrder = { 'ToOrder': 0, 'Ordered': 1, 'Arrived': 2, 'Sold': 3 }
    if (statusOrder[batch.status] > statusOrder[itemData.status]) {
      itemData.status = batch.status
    }
  })

  const aggregatedItems = Array.from(itemsMap.values())

  const batchesByLocation = filteredBatches.reduce(
    (acc: Record<string, { name: string; batches: StockBatch[] }>, batch) => {
      const locationKey = batch.locationId || "unassigned"
      const locationName = batch.location?.name || "Unassigned"

      if (!acc[locationKey]) {
        acc[locationKey] = {
          name: locationName,
          batches: [],
        }
      }

      acc[locationKey].batches.push(batch)
      return acc
    },
    {}
  )

  const locationSummary = Object.entries(batchesByLocation).map(([key, data]) => ({
    id: key,
    name: data.name,
    totalUnits: data.batches.reduce((sum, batch) => sum + batch.quantity, 0),
    batchCount: data.batches.length,
  }))

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-center gap-4">
        <Link href="/inventory">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Location Management</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage item locations and track inventory across different storage areas.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={locationFilter} onValueChange={setLocationFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by location" />
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {locationSummary.map((summary) => (
          <Card key={summary.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {summary.id === "unassigned" ? (
                  <MapPin className="h-4 w-4 inline mr-2 text-gray-400" />
                ) : (
                  <MapPin className="h-4 w-4 inline mr-2 text-blue-500" />
                )}
                {summary.name}
              </CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.batchCount}</div>
              <p className="text-xs text-muted-foreground">{summary.totalUnits} total units</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Items by Location
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading items...</div>
          ) : aggregatedItems.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cost/Unit</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Ordered Date</TableHead>
                    <TableHead>Arrived Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBatches.map((batch) => (
                    <TableRow key={batch.id}>
                      <TableCell className="font-medium">{batch.item.name}</TableCell>
                      <TableCell>{batch.item.company.name}</TableCell>
                      <TableCell>
                        {batch.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-blue-500" />
                            {batch.location.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">No location</span>
                        )}
                      </TableCell>
                      <TableCell>{batch.quantity} units</TableCell>
                      <TableCell>
                        <Badge variant={statusConfig[batch.status].variant}>
                          {statusConfig[batch.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>${batch.costPerUnitUSD.toFixed(2)}</TableCell>
                      <TableCell>${(batch.costPerUnitUSD * batch.quantity + batch.freightCostUSD).toFixed(2)}</TableCell>
                      <TableCell>{batch.orderDate ? new Date(batch.orderDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>{batch.arrivedDate ? new Date(batch.arrivedDate).toLocaleDateString() : '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openTransferDialog(batch)}
                            disabled={batch.status === 'Sold'}
                          >
                            <Move className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BatchTransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        batch={selectedBatch}
        locations={locations}
        onSuccess={handleTransferSuccess}
      />
    </div>
  )
}

export default function LocationManagementPageWithLayout() {
  return (
    <DashboardLayout>
      <LocationManagementPage />
    </DashboardLayout>
  )
}
