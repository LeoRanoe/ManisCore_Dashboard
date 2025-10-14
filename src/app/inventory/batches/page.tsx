"use client"

import { useState, useEffect, useMemo } from "react"
import { BatchDataTable } from "@/components/inventory/batch-data-table"
import { BatchFormDialog } from "@/components/inventory/batch-form-dialog"
import { BatchTransferDialog } from "@/components/inventory/batch-transfer-dialog"
import { Button } from "@/components/ui/button"
import { Plus, RefreshCw, Package, ChevronDown, ChevronRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

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
  const [viewMode, setViewMode] = useState<'grouped' | 'detailed'>('grouped')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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

  // Group batches by item for consolidated view
  const groupedBatches = useMemo(() => {
    const groups = new Map<string, {
      itemId: string
      itemName: string
      totalQuantity: number
      batches: StockBatch[]
      locations: Set<string>
      statuses: Set<string>
    }>()

    batches.forEach(batch => {
      const itemName = batch.item?.name || 'Unknown Item'
      if (!groups.has(batch.itemId)) {
        groups.set(batch.itemId, {
          itemId: batch.itemId,
          itemName,
          totalQuantity: 0,
          batches: [],
          locations: new Set(),
          statuses: new Set()
        })
      }
      
      const group = groups.get(batch.itemId)!
      group.totalQuantity += batch.quantity
      group.batches.push(batch)
      if (batch.location?.name) {
        group.locations.add(batch.location.name)
      }
      group.statuses.add(batch.status)
    })

    return Array.from(groups.values()).sort((a, b) => 
      a.itemName.localeCompare(b.itemName)
    )
  }, [batches])

  const toggleItemExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

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
            variant={viewMode === 'grouped' ? 'default' : 'outline'}
            onClick={() => setViewMode('grouped')}
            size="sm"
          >
            <Package className="h-4 w-4 mr-2" />
            Grouped
          </Button>
          <Button
            variant={viewMode === 'detailed' ? 'default' : 'outline'}
            onClick={() => setViewMode('detailed')}
            size="sm"
          >
            Detailed
          </Button>
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
      ) : viewMode === 'detailed' ? (
        <BatchDataTable
          batches={batches}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onTransfer={handleTransfer}
          onRefresh={fetchBatches}
        />
      ) : (
        <div className="space-y-4">
          {groupedBatches.map(group => {
            const isExpanded = expandedItems.has(group.itemId)
            return (
              <div key={group.itemId} className="border rounded-lg overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-muted/50 cursor-pointer hover:bg-muted"
                  onClick={() => toggleItemExpanded(group.itemId)}
                >
                  <div className="flex items-center gap-3">
                    {isExpanded ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <h3 className="font-semibold">{group.itemName}</h3>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="secondary">
                          {group.totalQuantity} units
                        </Badge>
                        <Badge variant="outline">
                          {group.batches.length} batch{group.batches.length !== 1 ? 'es' : ''}
                        </Badge>
                        {group.locations.size > 0 && (
                          <Badge variant="outline">
                            {group.locations.size} location{group.locations.size !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {Array.from(group.statuses).map(status => (
                      <Badge 
                        key={status}
                        variant={status === 'IN_STOCK' ? 'default' : status === 'RESERVED' ? 'secondary' : 'destructive'}
                      >
                        {status.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="p-4 bg-background">
                    <BatchDataTable
                      batches={group.batches}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onTransfer={handleTransfer}
                      onRefresh={fetchBatches}
                    />
                  </div>
                )}
              </div>
            )
          })}
          
          {groupedBatches.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No batches found. Create your first batch to get started.
            </div>
          )}
        </div>
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
