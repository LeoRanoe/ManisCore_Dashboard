"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ItemFormSchema, type ItemFormData } from "@/lib/validations"

interface Company {
  id: string
  name: string
  cashBalanceUSD?: number
}

interface User {
  id: string
  name: string
  email: string
  companyId: string
}

interface Location {
  id: string
  name: string
  companyId: string
}

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
    name: string
  }
  assignedUser?: {
    name: string
    email: string
  }
  location?: {
    name: string
  }
}

interface ItemFormDialogProps {
  isOpen: boolean
  onClose: () => void
  item?: Item
  companies: Company[]
  onSuccess: () => void
}

export function ItemFormDialog({
  isOpen,
  onClose,
  item,
  companies,
  onSuccess,
}: ItemFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(ItemFormSchema),
    defaultValues: item ? {
      name: item.name,
      status: item.status,
      quantityInStock: item.quantityInStock,
      costPerUnitUSD: item.costPerUnitUSD,
      freightCostUSD: item.freightCostUSD,
      sellingPriceSRD: item.sellingPriceSRD,
      supplier: (item as any).supplier || "",
      supplierSku: (item as any).supplierSku || "",
      orderDate: (item as any).orderDate || "",
      expectedArrival: (item as any).expectedArrival || "",
      orderNumber: (item as any).orderNumber || "",
      profitMarginPercent: (item as any).profitMarginPercent || 0,
      minStockLevel: (item as any).minStockLevel || 0,
      notes: item.notes || "",
      companyId: item.companyId,
      assignedUserId: item.assignedUserId || "",
      locationId: item.locationId || "",
    } : {
      name: "",
      status: "ToOrder",
      quantityInStock: 0,
      costPerUnitUSD: 0,
      freightCostUSD: 0,
      sellingPriceSRD: 0,
      supplier: "",
      supplierSku: "",
      orderDate: "",
      expectedArrival: "",
      orderNumber: "",
      profitMarginPercent: 0,
      minStockLevel: 0,
      notes: "",
      companyId: "",
      assignedUserId: "",
      locationId: "",
    },
  })

  // Reset form when dialog opens/closes or item changes
  useEffect(() => {
    if (isOpen) {
      if (item) {
        // Editing existing item
        reset({
          name: item.name,
          status: item.status,
          quantityInStock: item.quantityInStock,
          costPerUnitUSD: item.costPerUnitUSD,
          freightCostUSD: item.freightCostUSD,
          sellingPriceSRD: item.sellingPriceSRD,
          supplier: (item as any).supplier || "",
          supplierSku: (item as any).supplierSku || "",
          orderDate: (item as any).orderDate || "",
          expectedArrival: (item as any).expectedArrival || "",
          orderNumber: (item as any).orderNumber || "",
          profitMarginPercent: (item as any).profitMarginPercent || 0,
          minStockLevel: (item as any).minStockLevel || 0,
          notes: item.notes || "",
          companyId: item.companyId,
          assignedUserId: item.assignedUserId || "",
          locationId: item.locationId || "",
        })
      } else {
        // Creating new item
        reset({
          name: "",
          status: "ToOrder",
          quantityInStock: 0,
          costPerUnitUSD: 0,
          freightCostUSD: 0,
          sellingPriceSRD: 0,
          supplier: "",
          supplierSku: "",
          orderDate: "",
          expectedArrival: "",
          orderNumber: "",
          profitMarginPercent: 0,
          minStockLevel: 0,
          notes: "",
          companyId: companies.length > 0 && companies[0].id ? companies[0].id : "",
          assignedUserId: "",
          locationId: "",
        })
      }
    }
  }, [isOpen, item, companies, reset])

  const watchedStatus = watch("status")
  const watchedCompanyId = watch("companyId")

  // Fetch users and locations when company changes
  useEffect(() => {
    const fetchUsersAndLocations = async () => {
      if (!watchedCompanyId) {
        setUsers([])
        setLocations([])
        return
      }

      try {
        // Fetch users for the selected company
        const usersResponse = await fetch(`/api/users?companyId=${watchedCompanyId}`)
        if (usersResponse.ok) {
          const usersData = await usersResponse.json()
          setUsers(usersData.users || [])
        }

        // Fetch locations for the selected company
        const locationsResponse = await fetch(`/api/locations?companyId=${watchedCompanyId}`)
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json()
          setLocations(locationsData.locations || [])
        }
      } catch (error) {
        console.error("Error fetching users/locations:", error)
      }
    }

    fetchUsersAndLocations()
  }, [watchedCompanyId])

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true)
    try {
      console.log('Form data before cleaning:', data)
      
      // Clean up empty optional fields - convert empty strings to undefined
      const cleanData: any = {
        name: data.name,
        status: data.status,
        quantityInStock: data.quantityInStock,
        costPerUnitUSD: data.costPerUnitUSD,
        freightCostUSD: data.freightCostUSD,
        sellingPriceSRD: data.sellingPriceSRD,
        companyId: data.companyId,
      }
      
      // Only add optional string fields if they have meaningful values
      if (data.supplier && data.supplier.trim() !== "") cleanData.supplier = data.supplier.trim()
      if (data.supplierSku && data.supplierSku.trim() !== "") cleanData.supplierSku = data.supplierSku.trim()
      if (data.orderDate && data.orderDate.trim() !== "") cleanData.orderDate = data.orderDate.trim()
      if (data.expectedArrival && data.expectedArrival.trim() !== "") cleanData.expectedArrival = data.expectedArrival.trim()
      if (data.orderNumber && data.orderNumber.trim() !== "") cleanData.orderNumber = data.orderNumber.trim()
      if (data.notes && data.notes.trim() !== "") cleanData.notes = data.notes.trim()
      
      // Handle numeric optional fields properly (0 is a valid value)
      if (data.profitMarginPercent !== null && data.profitMarginPercent !== undefined && data.profitMarginPercent !== 0) {
        cleanData.profitMarginPercent = data.profitMarginPercent
      }
      if (data.minStockLevel !== null && data.minStockLevel !== undefined && data.minStockLevel !== 0) {
        cleanData.minStockLevel = data.minStockLevel
      }
      
      // Handle user and location assignments
      if (data.assignedUserId && data.assignedUserId !== "none" && data.assignedUserId.trim() !== "") {
        cleanData.assignedUserId = data.assignedUserId.trim()
      }
      if (data.locationId && data.locationId !== "none" && data.locationId.trim() !== "") {
        cleanData.locationId = data.locationId.trim()
      }
      
      console.log('Cleaned data being sent:', cleanData)

      const url = item ? `/api/items/${item.id}` : "/api/items"
      const method = item ? "PUT" : "POST"

      console.log(`Making ${method} request to ${url}`)
      
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Server error response:', errorData)
        throw new Error(errorData.error || errorData.message || `Failed to save item (${response.status})`)
      }

      toast({
        title: "Success",
        description: `Item ${item ? "updated" : "created"} successfully.`,
      })

      // Reset form to default values for new items
      if (!item) {
        reset({
          name: "",
          status: "ToOrder",
          quantityInStock: 0,
          costPerUnitUSD: 0,
          freightCostUSD: 0,
          sellingPriceSRD: 0,
          supplier: "",
          supplierSku: "",
          orderDate: "",
          expectedArrival: "",
          orderNumber: "",
          profitMarginPercent: 0,
          minStockLevel: 0,
          notes: "",
          companyId: companies.length > 0 && companies[0].id ? companies[0].id : "",
          assignedUserId: "",
          locationId: "",
        })
      }
      onClose()
      onSuccess()
    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Make changes to the item details below."
              : "Add a new item to your inventory."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Item Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="Enter item name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company *</Label>
              <Select
                value={watchedCompanyId}
                onValueChange={(value) => {
                  setValue("companyId", value)
                  // Clear user and location when company changes
                  setValue("assignedUserId", "")
                  setValue("locationId", "")
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a company" />
                </SelectTrigger>
                <SelectContent>
                  {companies
                    .filter((company) => company.id && company.id !== "")
                    .map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {errors.companyId && (
                <p className="text-sm text-red-500">{errors.companyId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={watchedStatus}
                onValueChange={(value) => setValue("status", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ToOrder">To Order</SelectItem>
                  <SelectItem value="Ordered">Ordered</SelectItem>
                  <SelectItem value="Arrived">Arrived</SelectItem>
                  <SelectItem value="Sold">Sold</SelectItem>
                </SelectContent>
              </Select>
              {errors.status && (
                <p className="text-sm text-red-500">{errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="quantityInStock">Quantity in Stock</Label>
              <Input
                id="quantityInStock"
                type="number"
                {...register("quantityInStock", { valueAsNumber: true })}
                placeholder="0"
              />
              {errors.quantityInStock && (
                <p className="text-sm text-red-500">
                  {errors.quantityInStock.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assignedUserId">Assigned User</Label>
              <Select
                value={watch("assignedUserId") || ""}
                onValueChange={(value) => setValue("assignedUserId", value)}
                disabled={!watchedCompanyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={watchedCompanyId ? "Select user" : "Select company first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No user assigned</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.assignedUserId && (
                <p className="text-sm text-red-500">{errors.assignedUserId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <Select
                value={watch("locationId") || ""}
                onValueChange={(value) => setValue("locationId", value)}
                disabled={!watchedCompanyId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={watchedCompanyId ? "Select location" : "Select company first"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No location assigned</SelectItem>
                  {locations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.locationId && (
                <p className="text-sm text-red-500">{errors.locationId.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="costPerUnitUSD">Cost per Unit (USD)</Label>
              <Input
                id="costPerUnitUSD"
                type="number"
                step="0.01"
                {...register("costPerUnitUSD", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.costPerUnitUSD && (
                <p className="text-sm text-red-500">
                  {errors.costPerUnitUSD.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="freightCostUSD">Freight Cost (USD)</Label>
              <Input
                id="freightCostUSD"
                type="number"
                step="0.01"
                {...register("freightCostUSD", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.freightCostUSD && (
                <p className="text-sm text-red-500">
                  {errors.freightCostUSD.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sellingPriceSRD">Selling Price (SRD)</Label>
              <Input
                id="sellingPriceSRD"
                type="number"
                step="0.01"
                {...register("sellingPriceSRD", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.sellingPriceSRD && (
                <p className="text-sm text-red-500">
                  {errors.sellingPriceSRD.message}
                </p>
              )}
            </div>
          </div>

          {/* Cash Balance Information */}
          {watchedStatus === "Ordered" && watchedCompanyId && (
            <div className="p-4 bg-muted rounded-lg border-l-4 border-l-blue-500">
              <h4 className="font-medium text-sm mb-2">Order Cost Information</h4>
              {(() => {
                const selectedCompany = companies.find(c => c.id === watchedCompanyId)
                const costPerUnit = Number(watch("costPerUnitUSD")) || 0
                const freight = Number(watch("freightCostUSD")) || 0
                const quantity = Number(watch("quantityInStock")) || 0
                const totalCost = (costPerUnit * quantity) + freight
                
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Cost per unit:</span>
                      <span>${costPerUnit.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quantity:</span>
                      <span>{quantity}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight cost:</span>
                      <span>${freight.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2 font-medium">
                      <span>Total order cost:</span>
                      <span>${totalCost.toFixed(2)}</span>
                    </div>
                    {selectedCompany?.cashBalanceUSD !== undefined && (
                      <>
                        <div className="flex justify-between">
                          <span>Company USD balance:</span>
                          <span>${selectedCompany.cashBalanceUSD.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Remaining after order:</span>
                          <span className={selectedCompany.cashBalanceUSD >= totalCost ? "text-green-600" : "text-red-600"}>
                            ${(selectedCompany.cashBalanceUSD - totalCost).toFixed(2)}
                          </span>
                        </div>
                        {selectedCompany.cashBalanceUSD < totalCost && (
                          <div className="mt-2 p-2 bg-red-100 text-red-700 rounded text-xs">
                            ⚠️ Insufficient funds! Company needs ${(totalCost - selectedCompany.cashBalanceUSD).toFixed(2)} more USD.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          {/* Order Management Fields */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-4">Order Management</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="supplier">Supplier</Label>
                <Input
                  id="supplier"
                  {...register("supplier")}
                  placeholder="Supplier name or website"
                />
                {errors.supplier && (
                  <p className="text-sm text-red-500">{errors.supplier.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="supplierSku">Supplier SKU</Label>
                <Input
                  id="supplierSku"
                  {...register("supplierSku")}
                  placeholder="Product code or SKU"
                />
                {errors.supplierSku && (
                  <p className="text-sm text-red-500">{errors.supplierSku.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="orderNumber">Order Number</Label>
                <Input
                  id="orderNumber"
                  {...register("orderNumber")}
                  placeholder="Order reference number"
                />
                {errors.orderNumber && (
                  <p className="text-sm text-red-500">{errors.orderNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="minStockLevel">Min Stock Level</Label>
                <Input
                  id="minStockLevel"
                  type="number"
                  min="0"
                  {...register("minStockLevel", { valueAsNumber: true })}
                  placeholder="Minimum stock to maintain"
                />
                {errors.minStockLevel && (
                  <p className="text-sm text-red-500">{errors.minStockLevel.message}</p>
                )}
              </div>

              {(watchedStatus === "Ordered" || watchedStatus === "Arrived") && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="orderDate">Order Date</Label>
                    <Input
                      id="orderDate"
                      type="date"
                      {...register("orderDate")}
                    />
                    {errors.orderDate && (
                      <p className="text-sm text-red-500">{errors.orderDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expectedArrival">Expected Arrival</Label>
                    <Input
                      id="expectedArrival"
                      type="date"
                      {...register("expectedArrival")}
                    />
                    {errors.expectedArrival && (
                      <p className="text-sm text-red-500">{errors.expectedArrival.message}</p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Additional notes about this item (optional)"
              rows={3}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : item ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}