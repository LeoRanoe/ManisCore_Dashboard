"use client"

import { useState } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Pencil, Trash2, ArrowRightLeft, Image as ImageIcon } from "lucide-react"

interface StockBatch {
  id: string
  itemId: string
  quantity: number
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  costPerUnitUSD: number
  freightCostUSD: number
  sellingPriceSRD: number
  orderedDate?: string | null
  arrivedDate?: string | null
  soldDate?: string | null
  imageUrls?: string[] | null
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

interface BatchDataTableProps {
  batches: StockBatch[]
  onEdit?: (batch: StockBatch) => void
  onDelete?: (batchId: string) => void
  onTransfer?: (batch: StockBatch) => void
  onRefresh?: () => void
}

export function BatchDataTable({ 
  batches, 
  onEdit, 
  onDelete, 
  onTransfer,
  onRefresh 
}: BatchDataTableProps) {
  const { toast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (batchId: string) => {
    if (!confirm("Are you sure you want to delete this batch? This action cannot be undone.")) {
      return
    }

    setDeletingId(batchId)
    try {
      const response = await fetch(`/api/batches/${batchId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to delete batch")
      }

      toast({
        title: "Success",
        description: "Batch deleted successfully",
      })

      if (onDelete) {
        onDelete(batchId)
      }
      if (onRefresh) {
        onRefresh()
      }
    } catch (error) {
      console.error("Error deleting batch:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete batch",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ToOrder":
        return "secondary"
      case "Ordered":
        return "default"
      case "Arrived":
        return "default"
      case "Sold":
        return "default"
      default:
        return "secondary"
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

  if (batches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No batches found. Create a new batch to get started.
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">Image</TableHead>
            <TableHead>Item</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Cost/Unit</TableHead>
            <TableHead>Freight</TableHead>
            <TableHead>Total Cost</TableHead>
            <TableHead>Selling Price</TableHead>
            <TableHead>Ordered</TableHead>
            <TableHead>Arrived</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.map((batch) => (
            <TableRow key={batch.id}>
              <TableCell>
                {batch.imageUrls && batch.imageUrls.length > 0 ? (
                  <div className="relative group">
                    <img
                      src={batch.imageUrls[0]}
                      alt={batch.item?.name || 'Batch'}
                      className="w-12 h-12 object-cover rounded border"
                    />
                    {batch.imageUrls.length > 1 && (
                      <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full border-2 border-background">
                        +{batch.imageUrls.length - 1}
                      </div>
                    )}
                    {/* Hover preview gallery */}
                    {batch.imageUrls.length > 0 && (
                      <div className="absolute left-full ml-2 top-0 z-50 hidden group-hover:block">
                        <div className="bg-background border rounded-lg shadow-lg p-2 grid grid-cols-2 gap-2 min-w-[200px]">
                          {batch.imageUrls.map((url, idx) => (
                            <img
                              key={idx}
                              src={url}
                              alt={`${batch.item?.name || 'Batch'} ${idx + 1}`}
                              className="w-20 h-20 object-cover rounded border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </TableCell>
              <TableCell className="font-medium">
                {batch.item?.name || "Unknown Item"}
              </TableCell>
              <TableCell>
                {batch.location?.name || "No Location"}
              </TableCell>
              <TableCell>{batch.quantity}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(batch.status)}>
                  {batch.status}
                </Badge>
              </TableCell>
              <TableCell>${batch.costPerUnitUSD.toFixed(2)}</TableCell>
              <TableCell>${batch.freightCostUSD.toFixed(2)}</TableCell>
              <TableCell>${calculateTotalCost(batch)}</TableCell>
              <TableCell>SRD {batch.sellingPriceSRD.toFixed(2)}</TableCell>
              <TableCell>{formatDate(batch.orderedDate)}</TableCell>
              <TableCell>{formatDate(batch.arrivedDate)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {onTransfer && batch.status === "Arrived" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTransfer(batch)}
                      title="Transfer to another location"
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(batch)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(batch.id)}
                    disabled={deletingId === batch.id}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
