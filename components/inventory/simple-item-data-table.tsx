"use client"

import { ArrowUpDown, Edit, Trash2, Package, MapPin, Image as ImageIcon } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useState } from "react"

interface Item {
  id: string
  name: string
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  quantityInStock: number
  costPerUnitUSD: number
  freightCostUSD: number
  sellingPriceSRD: number
  notes?: string
  imageUrls?: string[]
  totalCostPerUnitUSD: number
  profitPerUnitSRD: number
  totalProfitSRD: number
  companyId: string
  assignedUserId?: string
  locationId?: string
  useBatchSystem?: boolean
  batchCount?: number
  locationCount?: number
  batchLocations?: Array<{ id: string; name: string }>
  hasMultipleLocations?: boolean
  hasMultipleStatuses?: boolean
  statuses?: string[]
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

interface SimpleItemDataTableProps {
  items: Item[]
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (field: string) => void
  onEdit: (item: Item) => void
  onDelete: (itemId: string) => void
}

const statusConfig = {
  ToOrder: { label: "To Order", variant: "secondary" as const },
  Ordered: { label: "Ordered", variant: "warning" as const },
  Arrived: { label: "Arrived", variant: "success" as const },
  Sold: { label: "Sold", variant: "default" as const },
}

export function SimpleItemDataTable({
  items,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onDelete,
}: SimpleItemDataTableProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<Item | null>(null)

  const handleDeleteClick = (item: Item) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (itemToDelete) {
      onDelete(itemToDelete.id)
    }
    setDeleteDialogOpen(false)
    setItemToDelete(null)
  }

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 select-none"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-2">
        <span>{children}</span>
        <ArrowUpDown className="h-4 w-4" />
      </div>
    </TableHead>
  )

  if (items.length === 0) {
    return (
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHeader field="name">Item Name</SortableHeader>
              <SortableHeader field="status">Status</SortableHeader>
              <SortableHeader field="quantityInStock">Stock</SortableHeader>
              <TableHead>Location</TableHead>
              <SortableHeader field="sellingPriceSRD">Price (SRD)</SortableHeader>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                No items found. Add your first inventory item to get started.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Image</TableHead>
            <SortableHeader field="name">Item Name</SortableHeader>
            <SortableHeader field="status">Status</SortableHeader>
            <SortableHeader field="quantityInStock">Stock</SortableHeader>
            <TableHead>Location</TableHead>
            <SortableHeader field="sellingPriceSRD">Price (SRD)</SortableHeader>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const profitPerUnit = item.sellingPriceSRD - (item.costPerUnitUSD + (item.freightCostUSD / Math.max(item.quantityInStock, 1))) * 40
            
            return (
              <TableRow key={item.id}>
                <TableCell>
                  {item.imageUrls && item.imageUrls.length > 0 ? (
                    <div className="relative group">
                      <img
                        src={item.imageUrls[0]}
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded border"
                      />
                      {item.imageUrls.length > 1 && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full border-2 border-background">
                          +{item.imageUrls.length - 1}
                        </div>
                      )}
                      {/* Hover preview gallery */}
                      {item.imageUrls.length > 0 && (
                        <div className="absolute left-full ml-2 top-0 z-50 hidden group-hover:block">
                          <div className="bg-background border rounded-lg shadow-lg p-2 grid grid-cols-2 gap-2 min-w-[200px]">
                            {item.imageUrls.map((url, idx) => (
                              <img
                                key={idx}
                                src={url}
                                alt={`${item.name} ${idx + 1}`}
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
                <TableCell>
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {item.name}
                      {item.useBatchSystem && (
                        <Badge variant="outline" className="text-xs">
                          <Package className="h-3 w-3 mr-1" />
                          {item.batchCount || 0} batches
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {item.company.name}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  {item.hasMultipleStatuses ? (
                    <div className="flex flex-col gap-1">
                      {item.statuses?.map((status, idx) => (
                        <Badge key={idx} variant={statusConfig[status as keyof typeof statusConfig]?.variant || "secondary"} className="text-xs">
                          {statusConfig[status as keyof typeof statusConfig]?.label || status}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <Badge variant={statusConfig[item.status].variant}>
                      {statusConfig[item.status].label}
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className={item.quantityInStock === 0 ? "text-red-600 font-medium" : ""}>
                      {item.quantityInStock} units
                    </span>
                    {item.quantityInStock === 0 && (
                      <span className="text-xs text-red-500">Out of stock</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.hasMultipleLocations ? (
                    <div className="flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      <span className="font-medium">{item.locationCount} locations</span>
                    </div>
                  ) : item.location ? (
                    <span className="text-sm">{item.location.name}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">No location</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">SRD {item.sellingPriceSRD.toFixed(2)}</span>
                    <span className={`text-xs ${profitPerUnit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {profitPerUnit >= 0 ? '+' : ''}SRD {profitPerUnit.toFixed(2)} profit
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(item)}
                      className="gap-1"
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(item)}
                      className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}