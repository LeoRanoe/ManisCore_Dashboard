"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const BatchFormSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  locationId: z.string().optional(),
  quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
  status: z.enum(["ToOrder", "Ordered", "Arrived", "Sold"]),
  costPerUnitUSD: z.coerce.number().min(0, "Cost must be positive"),
  freightCostUSD: z.coerce.number().min(0, "Freight cost must be positive"),
  orderDate: z.string().optional(),
  expectedArrival: z.string().optional(),
  orderNumber: z.string().optional(),
  notes: z.string().optional(),
})

type BatchFormData = z.infer<typeof BatchFormSchema>

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

interface StockBatch {
  id: string
  itemId: string
  locationId?: string | null
  quantity: number
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  costPerUnitUSD: number
  freightCostUSD: number
  orderDate?: string | null
  expectedArrival?: string | null
  orderNumber?: string | null
  notes?: string | null
}

interface BatchFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch?: StockBatch | null
  items?: Item[]
  locations?: Location[]
  onSuccess?: () => void
}

export function BatchFormDialog({
  open,
  onOpenChange,
  batch,
  items = [],
  locations = [],
  onSuccess,
}: BatchFormDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedItem, setSelectedItem] = useState<Item | null>(null)
  const [filteredLocations, setFilteredLocations] = useState<Location[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm({
    resolver: zodResolver(BatchFormSchema),
    defaultValues: {
      itemId: "",
      locationId: undefined,
      quantity: 1,
      status: "ToOrder" as const,
      costPerUnitUSD: 0,
      freightCostUSD: 0,
      orderDate: "",
      expectedArrival: "",
      orderNumber: "",
      notes: "",
    },
  })

  const watchItemId = watch("itemId")

  // Update form when batch changes
  useEffect(() => {
    if (batch) {
      setValue("itemId", batch.itemId)
      setValue("locationId", batch.locationId || "")
      setValue("quantity", batch.quantity)
      setValue("status", batch.status)
      setValue("costPerUnitUSD", batch.costPerUnitUSD)
      setValue("freightCostUSD", batch.freightCostUSD)
      setValue("orderDate", batch.orderDate ? batch.orderDate.split('T')[0] : "")
      setValue("expectedArrival", batch.expectedArrival ? batch.expectedArrival.split('T')[0] : "")
      setValue("orderNumber", batch.orderNumber || "")
      setValue("notes", batch.notes || "")
    } else {
      reset()
    }
  }, [batch, setValue, reset])

  // Filter locations when item is selected
  useEffect(() => {
    if (watchItemId) {
      const item = items.find((i) => i.id === watchItemId)
      setSelectedItem(item || null)
      if (item) {
        const itemLocations = locations.filter((l) => l.companyId === item.companyId)
        setFilteredLocations(itemLocations)
      } else {
        setFilteredLocations([])
      }
    } else {
      setSelectedItem(null)
      setFilteredLocations([])
    }
  }, [watchItemId, items, locations])

  const onSubmit = async (data: BatchFormData) => {
    setIsSubmitting(true)
    try {
      const url = batch ? `/api/batches/${batch.id}` : "/api/batches"
      const method = batch ? "PATCH" : "POST"

      const payload = {
        ...data,
        quantity: Number(data.quantity),
        costPerUnitUSD: Number(data.costPerUnitUSD),
        freightCostUSD: Number(data.freightCostUSD),
        locationId: data.locationId || undefined,
        orderDate: data.orderDate || undefined,
        expectedArrival: data.expectedArrival || undefined,
        orderNumber: data.orderNumber || undefined,
        notes: data.notes || undefined,
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${batch ? "update" : "create"} batch`)
      }

      toast({
        title: "Success",
        description: `Batch ${batch ? "updated" : "created"} successfully`,
      })

      onOpenChange(false)
      reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error(`Error ${batch ? "updating" : "creating"} batch:`, error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${batch ? "update" : "create"} batch`,
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch ? "Edit" : "Create"} Stock Batch</DialogTitle>
          <DialogDescription>
            {batch
              ? "Update the batch details below"
              : "Add a new stock batch for an item"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Item Selection */}
            <div className="space-y-2">
              <Label htmlFor="itemId">Item *</Label>
              <Select
                value={watch("itemId")}
                onValueChange={(value) => setValue("itemId", value)}
                disabled={!!batch}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.itemId && (
                <p className="text-sm text-destructive">{errors.itemId.message}</p>
              )}
            </div>

            {/* Location Selection */}
            <div className="space-y-2">
              <Label htmlFor="locationId">Location</Label>
              <Select
                value={watch("locationId") || undefined}
                onValueChange={(value) => setValue("locationId", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredLocations.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {batch && (
                <p className="text-xs text-muted-foreground">
                  Location is editable. Changes will update item location if needed.
                </p>
              )}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                {...register("quantity")}
              />
              {errors.quantity && (
                <p className="text-sm text-destructive">{errors.quantity.message}</p>
              )}
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status *</Label>
              <Select
                value={watch("status")}
                onValueChange={(value: any) => setValue("status", value)}
              >
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
              {errors.status && (
                <p className="text-sm text-destructive">{errors.status.message}</p>
              )}
            </div>

            {/* Cost Per Unit USD */}
            <div className="space-y-2">
              <Label htmlFor="costPerUnitUSD">Cost per Unit (USD) *</Label>
              <Input
                id="costPerUnitUSD"
                type="number"
                step="0.01"
                min="0"
                {...register("costPerUnitUSD")}
              />
              {errors.costPerUnitUSD && (
                <p className="text-sm text-destructive">{errors.costPerUnitUSD.message}</p>
              )}
            </div>

            {/* Freight Cost USD */}
            <div className="space-y-2">
              <Label htmlFor="freightCostUSD">Freight Cost (USD) *</Label>
              <Input
                id="freightCostUSD"
                type="number"
                step="0.01"
                min="0"
                {...register("freightCostUSD")}
              />
              {errors.freightCostUSD && (
                <p className="text-sm text-destructive">{errors.freightCostUSD.message}</p>
              )}
            </div>

            {/* Order Date */}
            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date</Label>
              <Input
                id="orderDate"
                type="date"
                {...register("orderDate")}
              />
            </div>

            {/* Expected Arrival */}
            <div className="space-y-2">
              <Label htmlFor="expectedArrival">Expected Arrival</Label>
              <Input
                id="expectedArrival"
                type="date"
                {...register("expectedArrival")}
              />
            </div>

            {/* Order Number */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="orderNumber">Order Number</Label>
              <Input
                id="orderNumber"
                type="text"
                placeholder="Optional order reference"
                {...register("orderNumber")}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2 col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                type="text"
                placeholder="Additional notes (optional)"
                {...register("notes")}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : batch ? "Update Batch" : "Create Batch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
