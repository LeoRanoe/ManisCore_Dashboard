"use client"

import { useState } from "react"
import { Edit, Trash2, MoreHorizontal, ArrowUpDown } from "lucide-react"
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
  freightPerUnitUSD: number
  sellingPriceSRD: number
  totalCostPerUnitUSD: number
  profitPerUnitSRD: number
  totalProfitSRD: number
  companyId: string
  company: {
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
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency === "USD" ? "USD" : "SRD",
      minimumFractionDigits: 2,
    }).format(amount)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortableHeader field="name">Name</SortableHeader>
              </TableHead>
              <TableHead>Company</TableHead>
              <TableHead>
                <SortableHeader field="status">Status</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="quantityInStock">Quantity</SortableHeader>
              </TableHead>
              <TableHead className="text-right">
                <SortableHeader field="costPerUnitUSD">Cost/Unit</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead className="text-right">
                <SortableHeader field="sellingPriceSRD">Selling Price</SortableHeader>
              </TableHead>
              <TableHead className="text-right">Profit/Unit</TableHead>
              <TableHead className="text-right">Total Profit</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground">
                  No items found.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.company.name}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[item.status].variant}>
                      {statusConfig[item.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{item.quantityInStock}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.costPerUnitUSD, "USD")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.totalCostPerUnitUSD, "USD")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.sellingPriceSRD, "SRD")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.profitPerUnitSRD, "SRD")}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.totalProfitSRD, "SRD")}
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