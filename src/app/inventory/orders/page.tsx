"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, ShoppingCart, Search, Package, TrendingUp, AlertCircle } from "lucide-react"
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
  ToOrder: { label: "To Order", variant: "secondary" as const, color: "text-gray-600" },
  Ordered: { label: "Ordered", variant: "warning" as const, color: "text-yellow-600" },
  Arrived: { label: "Arrived", variant: "success" as const, color: "text-green-600" },
  Sold: { label: "Sold", variant: "default" as const, color: "text-blue-600" },
}

function OrderManagementPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [newStatus, setNewStatus] = useState<"ToOrder" | "Ordered" | "Arrived" | "Sold">("ToOrder")
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [processing, setProcessing] = useState(false)
  const { toast } = useToast()

  // Use dynamic hooks for automatic company filtering and error handling
  const { 
    data: itemsData, 
    loading, 
    error: itemsError,
    refresh: refreshItems 
  } = useItems(searchQuery, statusFilter)

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
              <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
              <p className="text-muted-foreground">
                Track order status and manage the order lifecycle of your inventory items.
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

  const handleStatusUpdate = async () => {
    if (!selectedItem) return

    setProcessing(true)
    try {
      const response = await fetch(`/api/items/${selectedItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          notes: `${selectedItem.notes || ""}\n[${new Date().toLocaleDateString()}] Status updated to ${statusConfig[newStatus].label}`.trim()
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to update status")
      }

      toast({
        title: "Success",
        description: `Status updated to ${statusConfig[newStatus].label}`,
      })

      // Refresh items and close dialog
      refreshItems()
      closeStatusDialog()
    } catch (error) {
      console.error("Error updating status:", error)
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive",
      })
    } finally {
      setProcessing(false)
    }
  }

  const openStatusDialog = (item: Item) => {
    setSelectedItem(item)
    setNewStatus(item.status)
    setStatusDialogOpen(true)
  }

  const closeStatusDialog = () => {
    setSelectedItem(null)
    setNewStatus("ToOrder")
    setStatusDialogOpen(false)
  }

  // Calculate order metrics
  const orderMetrics = items.reduce((acc, item) => {
    acc.total++
    switch (item.status) {
      case "ToOrder":
        acc.toOrder++
        break
      case "Ordered":
        acc.ordered++
        break
      case "Arrived":
        acc.arrived++
        break
      case "Sold":
        acc.sold++
        break
    }
    return acc
  }, { total: 0, toOrder: 0, ordered: 0, arrived: 0, sold: 0 })

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
            <h1 className="text-3xl font-bold tracking-tight">Order Management</h1>
            <p className="text-muted-foreground">
              Track order status and manage the order lifecycle of your inventory items.
            </p>
          </div>
        </div>
      </div>

      {/* Order Status Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderMetrics.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">To Order</CardTitle>
            <AlertCircle className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{orderMetrics.toOrder}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ordered</CardTitle>
            <ShoppingCart className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{orderMetrics.ordered}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arrived</CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{orderMetrics.arrived}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{orderMetrics.sold}</div>
          </CardContent>
        </Card>
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
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Order Status Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead>Current Status</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Cost (USD)</TableHead>
                <TableHead>Assigned To</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
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
                      ${(item.costPerUnitUSD + (item.freightCostUSD / Math.max(item.quantityInStock, 1))).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {item.assignedUser?.name || "Unassigned"}
                    </TableCell>
                    <TableCell>
                      {item.location?.name || "No location"}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openStatusDialog(item)}
                        className="gap-1"
                      >
                        Update Status
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={closeStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Order Status - {selectedItem?.name}</DialogTitle>
            <DialogDescription>
              Change the order status to track the item through its lifecycle.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="status">New Status</Label>
              <Select value={newStatus} onValueChange={(value) => setNewStatus(value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ToOrder">To Order</SelectItem>
                  <SelectItem value="Ordered">Ordered</SelectItem>
                  <SelectItem value="Arrived">Arrived</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                </SelectContent>
              </Select>
              {selectedItem && (
                <p className="text-sm text-muted-foreground mt-1">
                  Current status: {statusConfig[selectedItem.status].label}
                </p>
              )}
            </div>

            <div className="bg-muted p-3 rounded-md">
              <h4 className="font-medium mb-2">Status Guide:</h4>
              <ul className="text-sm space-y-1">
                <li><strong>To Order:</strong> Item needs to be ordered</li>
                <li><strong>Ordered:</strong> Order has been placed</li>
                <li><strong>Arrived:</strong> Item has arrived in inventory</li>
                <li><strong>Sold:</strong> Item has been sold</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeStatusDialog}>
              Cancel
            </Button>
            <Button onClick={handleStatusUpdate} disabled={processing}>
              {processing ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Wrap with DashboardLayout
export default function OrderManagementPageWithLayout() {
  return (
    <DashboardLayout>
      <OrderManagementPage />
    </DashboardLayout>
  )
}