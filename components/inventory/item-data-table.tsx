"use client"

import { useState, useEffect, useCallback, useMemo, memo } from "react"
import { Edit, Trash2, MoreHorizontal, ArrowUpDown, ShoppingCart, Package2, Image as ImageIcon } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
  imageUrls?: string[]
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

interface User {
  id: string
  name: string
  email: string
  companyId: string
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
  const [sellDialogItem, setSellDialogItem] = useState<Item | null>(null)
  const [removeDialogItem, setRemoveDialogItem] = useState<Item | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSelling, setIsSelling] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [sellQuantity, setSellQuantity] = useState(1)
  const [sellPrice, setSellPrice] = useState(0)
  const [sellLocationId, setSellLocationId] = useState<string>("")
  const [sellUserId, setSellUserId] = useState<string>("")
  const [removeQuantity, setRemoveQuantity] = useState(1)
  const [removeReason, setRemoveReason] = useState("")
  const [locations, setLocations] = useState<Location[]>([])
  const [users, setUsers] = useState<User[]>([])
  const { toast } = useToast()

  // Fetch locations and users - memoize to prevent unnecessary fetches
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [locationsRes, usersRes] = await Promise.all([
          fetch('/api/locations'),
          fetch('/api/users')
        ])
        
        if (locationsRes.ok) {
          const locationsData = await locationsRes.json()
          setLocations(locationsData.locations || [])
        }
        
        if (usersRes.ok) {
          const usersData = await usersRes.json()
          setUsers(usersData.users || [])
        }
      } catch (error) {
        console.error('Error fetching locations/users:', error)
      }
    }
    
    fetchData()
  }, []) // Empty dependency array - only fetch once

  const handleDelete = useCallback(async (item: Item) => {
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
  }, [onRefresh, toast])

  const handleSell = useCallback(async (item: Item) => {
    setIsSelling(true)
    try {
      const response = await fetch('/api/inventory/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'sell',
          itemId: item.id,
          quantityToSell: sellQuantity,
          sellingPriceSRD: sellPrice || item.sellingPriceSRD,
          locationId: sellLocationId || undefined,
          assignedUserId: sellUserId || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to sell item")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: `Successfully sold ${sellQuantity}x ${item.name}. Revenue: SRD ${result.sale.totalRevenue.toFixed(2)}`,
      })

      setSellDialogItem(null)
      setSellQuantity(1)
      setSellPrice(0)
      setSellLocationId("")
      setSellUserId("")
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sell item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSelling(false)
    }
  }, [sellQuantity, sellPrice, sellLocationId, sellUserId, onRefresh, toast])

  const handleRemove = useCallback(async (item: Item) => {
    setIsRemoving(true)
    try {
      const response = await fetch('/api/inventory/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'remove',
          itemId: item.id,
          quantityToRemove: removeQuantity,
          reason: removeReason,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to remove item from stock")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: `Successfully removed ${removeQuantity}x ${item.name} from stock. Cost allocated to profit: SRD ${result.removal.costAllocatedToProfit.toFixed(2)}`,
      })

      setRemoveDialogItem(null)
      setRemoveQuantity(1)
      setRemoveReason("")
      onRefresh()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item from stock. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRemoving(false)
    }
  }, [removeQuantity, removeReason, onRefresh, toast])

  const openSellDialog = useCallback((item: Item) => {
    setSellDialogItem(item)
    setSellQuantity(Math.min(1, item.quantityInStock))
    setSellPrice(item.sellingPriceSRD)
    setSellLocationId(item.locationId || "")
    setSellUserId(item.assignedUserId || "")
  }, [])

  const openRemoveDialog = useCallback((item: Item) => {
    setRemoveDialogItem(item)
    setRemoveQuantity(Math.min(1, item.quantityInStock))
    setRemoveReason("")
  }, [])

  const SortableHeader = useCallback(({ field, children }: { field: string; children: React.ReactNode }) => (
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
  ), [onSort])

  const formatCurrency = useCallback((amount: number, currency: string) => {
    if (currency === "SRD") {
      return `SRD ${amount.toFixed(2)}`
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount)
  }, [])

  return (
    <>
      <div className="rounded-md border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Image</TableHead>
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
                  <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                    No items found.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/50">
                    <TableCell>
                      {item.imageUrls && item.imageUrls.length > 0 ? (
                        <div className="relative group">
                          <img
                            src={item.imageUrls[0]}
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded border"
                          />
                          {item.imageUrls.length > 1 && (
                            <div className="absolute bottom-0 right-0 bg-black/70 text-white text-xs px-1 rounded-tl">
                              +{item.imageUrls.length - 1}
                            </div>
                          )}
                          {/* Show all images on hover */}
                          <div className="absolute left-full ml-2 top-0 hidden group-hover:flex gap-2 z-10 bg-background p-2 rounded-lg border shadow-lg">
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
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded border flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
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
                          {item.quantityInStock > 0 && (
                            <>
                              <DropdownMenuItem onClick={() => openSellDialog(item)}>
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Sell
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openRemoveDialog(item)}>
                                <Package2 className="mr-2 h-4 w-4" />
                                Remove from Stock
                              </DropdownMenuItem>
                            </>
                          )}
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

      {/* Sell Dialog */}
      <AlertDialog
        open={!!sellDialogItem}
        onOpenChange={() => {
          setSellDialogItem(null)
          setSellLocationId("")
          setSellUserId("")
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sell Item</AlertDialogTitle>
            <AlertDialogDescription>
              Sell "{sellDialogItem?.name}" from inventory. This will update your cash balance and create a sale record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellQuantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="sellQuantity"
                type="number"
                min="1"
                max={sellDialogItem?.quantityInStock || 1}
                value={sellQuantity}
                onChange={(e) => setSellQuantity(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellPrice" className="text-right">
                Price (SRD)
              </Label>
              <Input
                id="sellPrice"
                type="number"
                min="0"
                step="0.01"
                value={sellPrice}
                onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellLocation" className="text-right">
                Location
              </Label>
              <Select
                value={sellLocationId || "none"}
                onValueChange={(value) => setSellLocationId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {locations
                    .filter(loc => loc.companyId === sellDialogItem?.companyId)
                    .map(location => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="sellUser" className="text-right">
                Sold By
              </Label>
              <Select
                value={sellUserId || "none"}
                onValueChange={(value) => setSellUserId(value === "none" ? "" : value)}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select user (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {users
                    .filter(user => user.companyId === sellDialogItem?.companyId)
                    .map(user => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="text-sm text-muted-foreground">
              Available stock: {sellDialogItem?.quantityInStock}
              <br />
              Total revenue: SRD {((sellPrice || sellDialogItem?.sellingPriceSRD || 0) * sellQuantity).toFixed(2)}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sellDialogItem && handleSell(sellDialogItem)}
              disabled={isSelling || sellQuantity <= 0 || sellQuantity > (sellDialogItem?.quantityInStock || 0)}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSelling ? "Selling..." : "Sell"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove from Stock Dialog */}
      <AlertDialog
        open={!!removeDialogItem}
        onOpenChange={() => setRemoveDialogItem(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from Stock</AlertDialogTitle>
            <AlertDialogDescription>
              Remove "{removeDialogItem?.name}" from inventory. The cost will be allocated to profit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="removeQuantity" className="text-right">
                Quantity
              </Label>
              <Input
                id="removeQuantity"
                type="number"
                min="1"
                max={removeDialogItem?.quantityInStock || 1}
                value={removeQuantity}
                onChange={(e) => setRemoveQuantity(parseInt(e.target.value) || 1)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="removeReason" className="text-right">
                Reason
              </Label>
              <Input
                id="removeReason"
                placeholder="Optional reason for removal"
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Available stock: {removeDialogItem?.quantityInStock}
              <br />
              Cost to allocate: SRD {(((removeDialogItem?.costPerUnitUSD || 0) * 5.5) * removeQuantity).toFixed(2)}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeDialogItem && handleRemove(removeDialogItem)}
              disabled={isRemoving || removeQuantity <= 0 || removeQuantity > (removeDialogItem?.quantityInStock || 0)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isRemoving ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}