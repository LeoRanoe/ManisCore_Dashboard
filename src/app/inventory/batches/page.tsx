"use client"

import { useState, useEffect } from "react"
import { BatchDataTable } from "@/components/inventory/batch-data-table"
import { BatchFormDialog } from "@/components/inventory/batch-form-dialog"
import { BatchTransferDialog } from "@/components/inventory/batch-transfer-dialog"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

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

export default function BatchesPage() {
  const { toast } = useToast()
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [selectedBatch, setSelectedBatch] = useState<StockBatch | null>(null)

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches")
      if (!response.ok) {
        throw new Error("Failed to fetch batches")
      }
      const data = await response.json()
      setBatches(data.batches || [])
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to load batches",
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
  }, [])

  const handleEdit = (batch: StockBatch) => {
    setSelectedBatch(batch)
    setShowEditDialog(true)
  }

  const handleTransfer = (batch: StockBatch) => {
    setSelectedBatch(batch)
    setShowTransferDialog(true)
  }

  const handleDelete = () => {
    fetchBatches()
  }

  const handleSuccess = () => {
    fetchBatches()
    setSelectedBatch(null)
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Batches</h1>
          <p className="text-muted-foreground mt-1">
            Manage inventory batches across multiple locations
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={loadData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Batch
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading batches...</div>
      ) : (
        <BatchDataTable
          batches={batches}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTransfer={handleTransfer}
          onRefresh={fetchBatches}
        />
      )}

      <BatchFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        items={items}
        locations={locations}
        onSuccess={handleSuccess}
      />

      <BatchFormDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        batch={selectedBatch}
        items={items}
        locations={locations}
        onSuccess={handleSuccess}
      />

      <BatchTransferDialog
        open={showTransferDialog}
        onOpenChange={setShowTransferDialog}
        batch={selectedBatch}
        locations={locations}
        onSuccess={handleSuccess}
      />
    </div>
  )
}
