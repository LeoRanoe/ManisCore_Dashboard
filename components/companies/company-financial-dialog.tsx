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
import { CompanyFinancialUpdateSchema } from "@/lib/validations"
import { z } from "zod"
import { DollarSign, Wallet } from "lucide-react"

type CompanyFinancialData = z.infer<typeof CompanyFinancialUpdateSchema>

interface Company {
  id: string
  name: string
}

interface CompanyFinancialDialogProps {
  isOpen: boolean
  onClose: () => void
  company: Company
  onSuccess?: () => void
}

export function CompanyFinancialDialog({
  isOpen,
  onClose,
  company,
  onSuccess,
}: CompanyFinancialDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CompanyFinancialData>({
    resolver: zodResolver(CompanyFinancialUpdateSchema),
    defaultValues: {
      cashBalanceSRD: 0,
      cashBalanceUSD: 0,
      stockValueSRD: 0,
      stockValueUSD: 0,
    },
  })

  // Fetch current financial data when dialog opens
  useEffect(() => {
    if (isOpen && company) {
      fetchFinancialData()
    }
  }, [isOpen, company])

  const fetchFinancialData = async () => {
    setIsFetching(true)
    try {
      const response = await fetch(`/api/companies/${company.id}/financial`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch financial data")
      }

      const data = await response.json()
      setValue("cashBalanceSRD", data.cashBalanceSRD)
      setValue("cashBalanceUSD", data.cashBalanceUSD)
      setValue("stockValueSRD", data.stockValueSRD)
      setValue("stockValueUSD", data.stockValueUSD)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load financial data",
        variant: "destructive",
      })
    } finally {
      setIsFetching(false)
    }
  }

  const handleFormSubmit = async (data: CompanyFinancialData) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/companies/${company.id}/financial`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update financial data")
      }

      toast({
        title: "Success",
        description: "Financial data updated successfully",
      })

      onSuccess?.()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Manage Finances - {company.name}
          </DialogTitle>
          <DialogDescription>
            Update cash balances and stock values for this company
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="space-y-4 py-4">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-20 bg-muted animate-pulse rounded" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
            {/* Cash Balances Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                Cash Balances
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cashBalanceSRD">Cash Balance (SRD)</Label>
                  <Input
                    id="cashBalanceSRD"
                    type="number"
                    step="0.01"
                    {...register("cashBalanceSRD", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.cashBalanceSRD && (
                    <p className="text-sm text-red-500">{errors.cashBalanceSRD.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cashBalanceUSD">Cash Balance (USD)</Label>
                  <Input
                    id="cashBalanceUSD"
                    type="number"
                    step="0.01"
                    {...register("cashBalanceUSD", { valueAsNumber: true })}
                    placeholder="0.00"
                  />
                  {errors.cashBalanceUSD && (
                    <p className="text-sm text-red-500">{errors.cashBalanceUSD.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Stock Values Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground border-t pt-4">
                <DollarSign className="h-4 w-4" />
                Stock Values (Auto-calculated from inventory)
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="stockValueSRD">Stock Value (SRD)</Label>
                  <Input
                    id="stockValueSRD"
                    type="number"
                    step="0.01"
                    {...register("stockValueSRD", { valueAsNumber: true })}
                    placeholder="0.00"
                    disabled
                    className="bg-muted"
                  />
                  {errors.stockValueSRD && (
                    <p className="text-sm text-red-500">{errors.stockValueSRD.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="stockValueUSD">Stock Value (USD)</Label>
                  <Input
                    id="stockValueUSD"
                    type="number"
                    step="0.01"
                    {...register("stockValueUSD", { valueAsNumber: true })}
                    placeholder="0.00"
                    disabled
                    className="bg-muted"
                  />
                  {errors.stockValueUSD && (
                    <p className="text-sm text-red-500">{errors.stockValueUSD.message}</p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Stock values are automatically calculated from your inventory and cannot be manually edited.
              </p>
            </div>

            <DialogFooter className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || isFetching}
                className="min-w-[100px]"
              >
                {isLoading ? "Saving..." : "Update"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
