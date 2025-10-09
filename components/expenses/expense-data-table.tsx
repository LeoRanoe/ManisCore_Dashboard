"use client"

import { useState } from "react"
import { format } from "date-fns"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { ExpenseFormDialog } from "./expense-form-dialog"
import { useToast } from "@/components/ui/use-toast"
import { Edit2, Trash2, DollarSign } from "lucide-react"

interface Expense {
  id: string
  description: string
  amount: number
  currency: "SRD" | "USD"
  category: string
  date: string
  company: {
    id: string
    name: string
  } | null
  createdBy: {
    id: string
    name: string
    email: string
  } | null
}

interface Company {
  id: string
  name: string
  cashBalanceSRD: number
  cashBalanceUSD: number
}

interface ExpenseDataTableProps {
  expenses: Expense[]
  companies: Company[]
  currentUserId?: string
  onUpdate: () => void
}

const categoryColors: Record<string, string> = {
  DINNER: "bg-orange-100 text-orange-800",
  OFFICE_SUPPLIES: "bg-blue-100 text-blue-800",
  TRANSPORTATION: "bg-green-100 text-green-800",
  UTILITIES: "bg-purple-100 text-purple-800",
  MARKETING: "bg-pink-100 text-pink-800",
  MAINTENANCE: "bg-yellow-100 text-yellow-800",
  MISCELLANEOUS: "bg-gray-100 text-gray-800",
}

const categoryLabels: Record<string, string> = {
  DINNER: "Dinner",
  OFFICE_SUPPLIES: "Office Supplies",
  TRANSPORTATION: "Transportation",
  UTILITIES: "Utilities",
  MARKETING: "Marketing",
  MAINTENANCE: "Maintenance",
  MISCELLANEOUS: "Miscellaneous",
}

export function ExpenseDataTable({ 
  expenses, 
  companies, 
  currentUserId, 
  onUpdate 
}: ExpenseDataTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { toast } = useToast()

  const handleDelete = async (expense: Expense) => {
    setDeletingId(expense.id)
    const isIncome = expense.amount > 0
    const displayAmount = Math.abs(expense.amount)
    
    try {
      const response = await fetch(`/api/expenses/${expense.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete expense')
      }

      toast({
        title: isIncome ? "Income deleted" : "Expense deleted",
        description: `The ${isIncome ? 'income' : 'expense'} has been deleted and ${expense.currency === 'SRD' ? 'SRD ' : '$'}${displayAmount.toFixed(2)} has been ${isIncome ? 'removed from' : 'returned to'} ${expense.company?.name || 'the company'}.`,
      })

      onUpdate()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete expense",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const getCurrencySymbol = (currency: string) => {
    return currency === "SRD" ? "SRD " : "$"
  }

  if (expenses.length === 0) {
    return (
      <div className="text-center py-8">
        <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground">No expenses found</h3>
        <p className="text-sm text-muted-foreground">Start by adding your first expense.</p>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Description</TableHead>
            <TableHead className="hidden sm:table-cell">Amount</TableHead>
            <TableHead className="hidden md:table-cell">Category</TableHead>
            <TableHead className="hidden lg:table-cell">Company</TableHead>
            <TableHead className="hidden lg:table-cell">Created By</TableHead>
            <TableHead className="hidden md:table-cell">Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {expenses.map((expense) => {
            // All expenses should be positive amounts
            const displayAmount = Math.abs(expense.amount)
            
            return (
            <TableRow key={expense.id}>
              <TableCell className="font-medium">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span>{expense.description}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1 sm:hidden">
                    <span className="font-mono text-sm font-semibold text-red-600">
                      -{getCurrencySymbol(expense.currency)}{displayAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1 md:hidden">
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${categoryColors[expense.category] || categoryColors.MISCELLANEOUS}`}
                    >
                      {categoryLabels[expense.category] || expense.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground md:hidden">
                      {format(new Date(expense.date), "MMM dd, yyyy")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 lg:hidden">
                    {expense.company?.name || 'Unknown Company'} • {expense.createdBy?.name || 'Unknown User'}
                  </div>
                </div>
              </TableCell>
              <TableCell className="font-mono hidden sm:table-cell">
                <span className="font-semibold text-red-600">
                  -{getCurrencySymbol(expense.currency)}{displayAmount.toFixed(2)}
                </span>
                <span className="ml-1 text-xs text-muted-foreground">
                  {expense.currency}
                </span>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                <Badge 
                  variant="secondary" 
                  className={categoryColors[expense.category] || categoryColors.MISCELLANEOUS}
                >
                  {categoryLabels[expense.category] || expense.category}
                </Badge>
              </TableCell>
              <TableCell className="hidden lg:table-cell">{expense.company?.name || 'Unknown Company'}</TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="flex flex-col">
                  <span className="text-sm">{expense.createdBy?.name || 'Unknown User'}</span>
                  <span className="text-xs text-muted-foreground">{expense.createdBy?.email || 'N/A'}</span>
                </div>
              </TableCell>
              <TableCell className="hidden md:table-cell">{format(new Date(expense.date), "MMM dd, yyyy")}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <ExpenseFormDialog
                    expense={expense}
                    companies={companies}
                    currentUserId={currentUserId}
                    onSuccess={onUpdate}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    }
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this expense? This will return{" "}
                          <strong>
                            {getCurrencySymbol(expense.currency)}{displayAmount.toFixed(2)}
                          </strong>{" "}
                          to {expense.company?.name || 'the company'}'s cash balance.
                          <br />
                          <br />
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(expense)}
                          disabled={deletingId === expense.id}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deletingId === expense.id ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}