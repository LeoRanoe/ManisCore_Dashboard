"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ShoppingCart, Package, TrendingUp, AlertCircle, Plus, RefreshCw, MapPin, Edit } from "lucide-react"
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
import { BatchFormDialog } from "@/components/inventory/batch-form-dialog"
import Link from "next/link"

interface StockBatch {
  id: string
  itemId: string
  locationId?: string | null
  quantity: number
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  costPerUnitUSD: number
  freightCostUSD: number
  sellingPriceSRD: number
  orderedDate?: string | null
  arrivedDate?: string | null
  soldDate?: string | null
  location?: {
    id: string
    name: string
  } | null
  item?: {
    id: string
    name: string
    company?: {
      id: string
      name: string
    }
  }
  createdAt: string
}

interface Item {
  id: string
  name: string
  companyId: string
}

interface Location {
  id: string
  name: string
  companyId: string
}

const statusConfig = {
  ToOrder: { label: "To Order", variant: "secondary" as const, color: "bg-gray-100 text-gray-700" },
  Ordered: { label: "Ordered", variant: "warning" as const, color: "bg-yellow-100 text-yellow-700" },
  Arrived: { label: "Arrived", variant: "success" as const, color: "bg-green-100 text-green-700" },
  Sold: { label: "Sold", variant: "default" as const, color: "bg-blue-100 text-blue-700" },
}

export default function OrderManagementPage() {
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const { toast } = useToast()

  const fetchBatches = async () => {
    try {
      let url = "/api/batches?"
      const params = new URLSearchParams()
      
      if (statusFilter && statusFilter !== "all") {
        params.append("status", statusFilter)
      }
      if (searchQuery) {
        params.append("search", searchQuery)
      }

      const response = await fetch(url + params.toString())
      if (!response.ok) {
        throw new Error("Failed to fetch batches")
      }
      const data = await response.json()
      setBatches(data.batches || [])
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to load order batches",
        variant: "destructive",
      })
    }
  }

  const fetchItems = async () => {
    try {
      const response = await fetch("/api/items?limit=1000")
      if (!response.ok) {
        throw new Error("Failed to fetch items")
      }
      const data = await response.json()
      setItems(data.items || [])
    } catch (error) {
      console.error("Error fetching items:", error)
    }
  }

  const fetchLocations = async () => {
    try {
      const response = await fetch("/api/locations?limit=1000")
      if (!response.ok) {
        throw new Error("Failed to fetch locations")
      }
      const data = await response.json()
      setLocations(data.locations || [])
    } catch (error) {
      console.error("Error fetching locations:", error)
    }
  }

  const loadData = async () => {
    setLoading(true)
    await Promise.all([fetchBatches(), fetchItems(), fetchLocations()])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [statusFilter, searchQuery])

  const handleEdit = (batch: StockBatch) => {
    setSelectedBatch(batch)
    setShowEditDialog(true)
  }

  const handleSuccess = () => {
    fetchBatches()
    setSelectedBatch(null)
  }

  const handleUpdateStatus = async (batchId: string, newStatus: "ToOrder" | "Ordered" | "Arrived" | "Sold") => {
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to update status")
      }

      toast({
        title: "Success",
        description: `Order status updated to ${statusConfig[newStatus].label}`,
      })

      fetchBatches()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "-"
    return new Date(dateString).toLocaleDateString()
  }

  const calculateTotalCost = (batch: StockBatch) => {
    const totalCost = (batch.costPerUnitUSD * batch.quantity) + batch.freightCostUSD
    return totalCost.toFixed(2)
  }

  const orderMetrics = batches.reduce(
    (acc, batch) => {
      acc.total++
      acc.totalQuantity += batch.quantity
      acc.totalValue += (batch.costPerUnitUSD * batch.quantity) + batch.freightCostUSD
      
      switch (batch.status) {
        case "ToOrder":
          acc.toOrder++
          break
        case "Ordered":
          acc.ordered++
          acc.orderedValue += (batch.costPerUnitUSD * batch.quantity) + batch.freightCostUSD
          break
        case "Arrived":
          acc.arrived++
          acc.arrivedValue += (batch.costPerUnitUSD * batch.quantity) + batch.freightCostUSD
          break
        case "Sold":
          acc.sold++
          break
      }
      return acc
    },
    { 
      total: 0, 
      toOrder: 0, 
      ordered: 0, 
      arrived: 0, 
      sold: 0, 
      totalQuantity: 0,
      totalValue: 0,
      orderedValue: 0,
      arrivedValue: 0,
    }
  )

  const filteredBatches = batches.filter((batch) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        batch.item?.name.toLowerCase().includes(query) ||
        batch.location?.name.toLowerCase().includes(query) ||
        batch.item?.company?.name.toLowerCase().includes(query)
      )
    }
    return true
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="sm">
            <Link href="/inventory">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Inventory
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
            <p className="text-muted-foreground">
              Track and manage order batches throughout their lifecycle
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Order Batch
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderMetrics.total}</div>
            <p className="text-xs text-muted-foreground">{orderMetrics.totalQuantity} units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Order</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{orderMetrics.toOrder}</div>
            <p className="text-xs text-muted-foreground">Pending placement</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <ShoppingCart className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{orderMetrics.ordered}</div>
            <p className="text-xs text-muted-foreground">${orderMetrics.orderedValue.toFixed(2)} in transit</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrived</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{orderMetrics.arrived}</div>
            <p className="text-xs text-muted-foreground">${orderMetrics.arrivedValue.toFixed(2)} in stock</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orderMetrics.sold}</div>
            <p className="text-xs text-muted-foreground">Completed orders</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <Input placeholder="Search by item, location, or company..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="max-w-sm" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="ToOrder">To Order</SelectItem>
            <SelectItem value="Ordered">Ordered</SelectItem>
            <SelectItem value="Arrived">Arrived</SelectItem>
            <SelectItem value="Sold">Sold</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading order batches...</div>
      ) : filteredBatches.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
            <p>No order batches found. Create a new order batch to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost/Unit</TableHead>
                <TableHead>Total Cost</TableHead>
                <TableHead>Ordered Date</TableHead>
                <TableHead>Arrived Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBatches.map((batch) => (
                <TableRow key={batch.id}>
                  <TableCell className="font-medium">{batch.item?.name || "Unknown Item"}</TableCell>
                  <TableCell>{batch.item?.company?.name || "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground" />
                      {batch.location?.name || "No Location"}
                    </div>
                  </TableCell>
                  <TableCell>{batch.quantity} units</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[batch.status].variant}>{statusConfig[batch.status].label}</Badge>
                  </TableCell>
                  <TableCell>${batch.costPerUnitUSD.toFixed(2)}</TableCell>
                  <TableCell className="font-medium">${calculateTotalCost(batch)}</TableCell>
                  <TableCell>{formatDate(batch.orderedDate)}</TableCell>
                  <TableCell>{formatDate(batch.arrivedDate)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {batch.status === "ToOrder" && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(batch.id, "Ordered")}>
                          Mark Ordered
                        </Button>
                      )}
                      {batch.status === "Ordered" && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(batch.id, "Arrived")}>
                          Mark Arrived
                        </Button>
                      )}
                      {batch.status === "Arrived" && (
                        <Button variant="outline" size="sm" onClick={() => handleUpdateStatus(batch.id, "Sold")}>
                          Mark Sold
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(batch)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <BatchFormDialog open={showCreateDialog} onOpenChange={setShowCreateDialog} items={items} locations={locations} onSuccess={handleSuccess} />
      <BatchFormDialog open={showEditDialog} onOpenChange={setShowEditDialog} batch={selectedBatch} items={items} locations={locations} onSuccess={handleSuccess} />
    </div>
  )
}