"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"

function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground">
            Track and manage your business expenses.
          </p>
        </div>
      </div>
      <div className="text-center py-8">
        <p className="text-muted-foreground">Expense management coming soon...</p>
      </div>
    </div>
  )
}

export default function ExpensesPageWithLayout() {
  return (
    <DashboardLayout>
      <ExpensesPage />
    </DashboardLayout>
  )
}
