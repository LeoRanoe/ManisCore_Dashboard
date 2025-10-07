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

const TransferFormSchema = z.object({
  targetLocationId: z.string().min(1, "Target location is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
})

type TransferFormData = z.infer<typeof TransferFormSchema>

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
  status: string
  item?: {
    id: string
    name: string
  }
  location?: {
    id: string
    name: string
  } | null
}

interface BatchTransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  batch: StockBatch | null
  locations?: Location[]
  onSuccess?: () => void
}

export function BatchTransferDialog({
  open,
  onOpenChange,
  batch,
  locations = [],
  onSuccess,
}: BatchTransferDialogProps) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableLocations, setAvailableLocations] = useState<Location[]>([])

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<TransferFormData>({
    resolver: zodResolver(TransferFormSchema),
    defaultValues: {
      targetLocationId: "",
      quantity: 1,
    },
  })

  // Filter out current location
  useEffect(() => {
    if (batch && locations.length > 0) {
      const filtered = locations.filter((loc) => loc.id !== batch.locationId)
      setAvailableLocations(filtered)
      setValue("quantity", batch.quantity)
    }
  }, [batch, locations, setValue])

  const onSubmit = async (data: TransferFormData) => {
    if (!batch) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/batches/${batch.id}/transfer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          toLocationId: data.targetLocationId,
          quantity: Number(data.quantity),
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to transfer batch")
      }

      const result = await response.json()

      toast({
        title: "Success",
        description: result.split
          ? `Batch split and ${data.quantity} units transferred successfully`
          : "Batch transferred successfully",
      })

      onOpenChange(false)
      reset()
      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error("Error transferring batch:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to transfer batch",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!batch) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Transfer Batch</DialogTitle>
          <DialogDescription>
            Transfer {batch.item?.name || "batch"} from{" "}
            {batch.location?.name || "current location"} to another location
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Location</Label>
            <Input
              value={batch.location?.name || "No Location"}
              disabled
              className="bg-muted"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetLocationId">Target Location *</Label>
            <Select
              value={watch("targetLocationId")}
              onValueChange={(value) => setValue("targetLocationId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select target location" />
              </SelectTrigger>
              <SelectContent>
                {availableLocations.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.targetLocationId && (
              <p className="text-sm text-destructive">
                {errors.targetLocationId.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quantity">
              Quantity * (Available: {batch.quantity})
            </Label>
            <Input
              id="quantity"
              type="number"
              min="1"
              max={batch.quantity}
              {...register("quantity", {
                valueAsNumber: true,
                max: {
                  value: batch.quantity,
                  message: `Cannot transfer more than ${batch.quantity} units`,
                },
              })}
            />
            {errors.quantity && (
              <p className="text-sm text-destructive">{errors.quantity.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Note: If quantity is less than total, the batch will be split
            </p>
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
              {isSubmitting ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
