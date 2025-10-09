"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { ExpenseFormSchema, type ExpenseFormData } from "@/lib/validations"
import { Plus, Edit2, DollarSign } from "lucide-react"

interface Company {
  id: string
  name: string
  cashBalanceSRD: number
  cashBalanceUSD: number
}

interface ExpenseFormDialogProps {
  expense?: any
  companies: Company[]
  currentUserId?: string
  trigger?: React.ReactNode
  onSuccess?: () => void
}

const expenseCategories = [
  { value: "DINNER", label: "Dinner" },
  { value: "OFFICE_SUPPLIES", label: "Office Supplies" },
  { value: "TRANSPORTATION", label: "Transportation" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MARKETING", label: "Marketing" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "MISCELLANEOUS", label: "Miscellaneous" },
  { value: "INCOME", label: "Income" },
]

const currencies = [
  { value: "SRD", label: "SRD (Surinamese Dollar)", symbol: "SRD" },
  { value: "USD", label: "USD (US Dollar)", symbol: "$" },
]

export function ExpenseFormDialog({ 
  expense, 
  companies, 
  currentUserId, 
  trigger, 
  onSuccess 
}: ExpenseFormDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(ExpenseFormSchema),
    defaultValues: {
      description: expense?.description || "",
      amount: expense?.amount || 0,
      category: expense?.category || "MISCELLANEOUS",
      currency: expense?.currency || "SRD",
      companyId: expense?.companyId || "",
      createdById: currentUserId || undefined,
      date: expense?.date ? new Date(expense.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    },
  })

  const selectedCompanyId = watch("companyId")
  const selectedCurrency = watch("currency")
  const selectedCompany = companies.find(c => c.id === selectedCompanyId)

  const getCashBalance = () => {
    if (!selectedCompany) return 0
    return selectedCurrency === "SRD" ? selectedCompany.cashBalanceSRD : selectedCompany.cashBalanceUSD
  }

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true)
    try {
      const url = expense ? `/api/expenses/${expense.id}` : '/api/expenses'
      const method = expense ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save expense')
      }

      toast({
        title: expense ? "Expense updated" : "Expense created",
        description: expense 
          ? "The expense has been updated successfully."
          : "The expense has been created and deducted from company cash balance.",
      })

      setOpen(false)
      reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (expense) {
      setValue("description", expense.description)
      setValue("amount", expense.amount)
      setValue("category", expense.category)
      setValue("currency", expense.currency)
      setValue("companyId", expense.companyId)
      setValue("date", new Date(expense.date).toISOString().split('T')[0])
    }
  }, [expense, setValue])

  const defaultTrigger = (
    <Button size="sm" className="gap-2">
      {expense ? <Edit2 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      {expense ? "Edit Expense" : "Add Expense"}
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {expense ? "Edit Expense" : "Add New Expense"}
          </DialogTitle>
          <DialogDescription>
            {expense ? "Update the expense details below." : "Enter the expense details and select a company. The amount will be deducted from the company's cash balance."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              placeholder="Enter expense description"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...register("amount", { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-red-600">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select value={selectedCurrency} onValueChange={(value) => setValue("currency", value as "SRD" | "USD")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.symbol} {currency.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={watch("category")} onValueChange={(value) => setValue("category", value as any)}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {expenseCategories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyId">Company</Label>
            <Select value={selectedCompanyId} onValueChange={(value) => setValue("companyId", value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    <div className="flex flex-col">
                      <span>{company.name}</span>
                      <span className="text-xs text-muted-foreground">
                        Cash: SRD {company.cashBalanceSRD.toFixed(2)} / ${company.cashBalanceUSD.toFixed(2)}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.companyId && (
              <p className="text-sm text-red-600">{errors.companyId.message}</p>
            )}
          </div>

          {selectedCompany && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Available Cash Balance:</p>
              <p className="text-lg font-bold text-green-600">
                {selectedCurrency === "SRD" ? "SRD " : "$"}{getCashBalance().toFixed(2)}
              </p>
              {getCashBalance() < watch("amount") && (
                <p className="text-sm text-red-600 mt-1">
                  ⚠️ Insufficient funds in company account
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
            />
            {errors.date && (
              <p className="text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || (selectedCompany && getCashBalance() < watch("amount"))}
            >
              {isLoading ? "Saving..." : expense ? "Update Expense" : "Create Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}