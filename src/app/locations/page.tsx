"use client"

import { DashboardLayout } from "@/components/layout/dashboard-layout"

function LocationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">
            Manage your business locations and storage facilities.
          </p>
        </div>
      </div>
      <div className="text-center py-8">
        <p className="text-muted-foreground">Locations management coming soon...</p>
      </div>
    </div>
  )
}

export default function LocationsPageWithLayout() {
  return (
    <DashboardLayout>
      <LocationsPage />
    </DashboardLayout>
  )
}
