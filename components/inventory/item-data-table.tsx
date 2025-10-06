"use client"

import { useState } from "react"
import { Edit, Trash2, MoreHorizontal, ArrowUpDown, ShoppingCart, Package2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface Item {
  id: string
  name: string
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  quantityInStock: number
  costPerUnitUSD: number
  freightCostUSD: number
  sellingPriceSRD: number
  notes?: string
  totalCostPerUnitUSD: number
  profitPerUnitSRD: number
  totalProfitSRD: number
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

interface ItemDataTableProps {
  items: Item[]
  sortBy?: string
  sortOrder?: "asc" | "desc"
  onSort: (field: string) => void
  onEdit: (item: Item) => void
  onRefresh: () => void
}

const statusConfig = {
  ToOrder: { label: "To Order", variant: "secondary" as const },
  Ordered: { label: "Ordered", variant: "warning" as const },
  Arrived: { label: "Arrived", variant: "success" as const },
  Sold: { label: "Sold", variant: "default" as const },
}

export function ItemDataTable({
  items,
  sortBy,
  sortOrder,
  onSort,
  onEdit,
  onRefresh,
}: ItemDataTableProps) {
  const [deleteDialogItem, setDeleteDialogItem] = useState<Item | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async (item: Item) => {
    setIsDeleting(true)
    try {
      const response = await fetch(`/api/items/${item.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete item")
      }

      toast({
        title: "Success",
        description: `Item "${item.name}" was deleted successfully.`,
      })

      setDeleteDialogItem(null)
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const SortableHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      className="h-auto p-0 font-medium hover:bg-transparent"
      onClick={() => onSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        <ArrowUpDown className="h-4 w-4" />
      </span>
    </Button>
  )

  const formatCurrency = (amount: number, currency: string) => {
    if (currency === "SRD") {
      return `SRD ${amount.toFixed(2)}`
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">
                  <SortableHeader field="name">Item</SortableHeader>
                </TableHead>
                <TableHead className="hidden sm:table-cell">Company</TableHead>
                <TableHead className="hidden md:table-cell">User</TableHead>
                <TableHead className="hidden lg:table-cell">Location</TableHead>
                <TableHead>
                  <SortableHeader field="status">Status</SortableHeader>
                </TableHead>
                <TableHead className="text-right">
                  <SortableHeader field="quantityInStock">Qty</SortableHeader>
                </TableHead>
                <TableHead className="text-right hidden md:table-cell">
                  <SortableHeader field="costPerUnitUSD">Cost</SortableHeader>
                </TableHead>
                <TableHead className="text-right hidden lg:table-cell">
                  <SortableHeader field="sellingPriceSRD">Price</SortableHeader>
                </TableHead>
                <TableHead className="text-right hidden xl:table-cell">Profit</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      <div className="space-y-1">
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-muted-foreground sm:hidden">
                          {item.company.name}
                        </div>
                        <div className="flex gap-2 text-xs text-muted-foreground md:hidden">
                          <span>Cost: ${item.costPerUnitUSD.toFixed(2)}</span>
                          <span>•</span>
                          <span>Price: SRD {item.sellingPriceSRD.toFixed(2)}</span>
                          <span>•</span>
                          <span className={item.profitPerUnitSRD >= 0 ? 'text-green-600' : 'text-red-600'}>
                            Profit: SRD {item.profitPerUnitSRD.toFixed(2)}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="text-xs text-muted-foreground">
                            {item.notes}
                          </div>
                        )}
                        {(item as any).supplier && (
                          <div className="text-xs text-muted-foreground">
                            Supplier: {(item as any).supplier}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">{item.company.name}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      {item.assignedUser ? (
                        <div className="space-y-1">
                          <div className="text-sm font-medium">{item.assignedUser.name}</div>
                          <div className="text-xs text-muted-foreground">{item.assignedUser.email}</div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {item.location ? (
                        <span className="text-sm">{item.location.name}</span>
                      ) : (
                        <span className="text-muted-foreground">No location</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusConfig[item.status].variant} className="whitespace-nowrap">
                        {statusConfig[item.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">{item.quantityInStock}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">
                      <div className="space-y-1">
                        <div className="text-sm">{formatCurrency(item.costPerUnitUSD, "USD")}</div>
                        <div className="text-xs text-muted-foreground">
                          Total: {formatCurrency(item.totalCostPerUnitUSD, "USD")}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">
                      {formatCurrency(item.sellingPriceSRD, "SRD")}
                    </TableCell>
                    <TableCell className="text-right hidden xl:table-cell">
                      <div className="space-y-1">
                        <div className={`text-sm font-medium ${item.profitPerUnitSRD >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(item.profitPerUnitSRD, "SRD")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Total: {formatCurrency(item.totalProfitSRD, "SRD")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.sellingPriceSRD > 0 ? 
                            `${((item.profitPerUnitSRD / item.sellingPriceSRD) * 100).toFixed(1)}% margin` : 
                            'No margin'
                          }
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(item)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialogItem(item)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog
        open={!!deleteDialogItem}
        onOpenChange={() => setDeleteDialogItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the item "
              {deleteDialogItem?.name}" from your inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialogItem && handleDelete(deleteDialogItem)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}