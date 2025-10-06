"use client"

import { useState } from "react"
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
}

interface Item {
  id: string
  name: string
  status: "ToOrder" | "Ordered" | "Arrived" | "Sold"
  quantityInStock: number
  costPerUnitUSD: number
  freightPerUnitUSD: number
  sellingPriceSRD: number
  companyId: string
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
    defaultValues: item || {
      name: "",
      status: "ToOrder",
      quantityInStock: 0,
      costPerUnitUSD: 0,
      freightPerUnitUSD: 0,
      sellingPriceSRD: 0,
      companyId: "",
    },
  })

  const watchedStatus = watch("status")
  const watchedCompanyId = watch("companyId")

  const onSubmit = async (data: ItemFormData) => {
    setIsSubmitting(true)
    try {
      const url = item ? `/api/items/${item.id}` : "/api/items"
      const method = item ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to save item")
      }

      toast({
        title: "Success",
        description: `Item ${item ? "updated" : "created"} successfully.`,
      })

      reset()
      onClose()
      onSuccess()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save item. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Item" : "Add New Item"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Make changes to the item details below."
              : "Add a new item to your inventory."}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
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
            <Label htmlFor="company">Company</Label>
            <Select
              value={watchedCompanyId}
              onValueChange={(value) => setValue("companyId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
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

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
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

          <div className="grid grid-cols-2 gap-4">
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="freightPerUnitUSD">Freight per Unit (USD)</Label>
              <Input
                id="freightPerUnitUSD"
                type="number"
                step="0.01"
                {...register("freightPerUnitUSD", { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.freightPerUnitUSD && (
                <p className="text-sm text-red-500">
                  {errors.freightPerUnitUSD.message}
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

          <DialogFooter>
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