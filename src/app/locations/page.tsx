"use client"

import { useState, useMemo } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LocationDataTable } from "@/components/locations/location-data-table"
import { LocationFormDialog } from "@/components/locations/location-form-dialog"
import { useLocations, useApi } from "@/lib/hooks"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { MapPin, Building2, Users, Package, Search, Plus } from "lucide-react"

function LocationsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [selectedLocation, setSelectedLocation] = useState<any>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Fetch locations
  const { data: locationsData, loading: locationsLoading, error: locationsError, refresh: refreshLocations } = useLocations(searchQuery, statusFilter)
  
  // Fetch companies
  const { data: companiesData, loading: companiesLoading } = useApi<{ companies: any[] }>("/api/companies")
  
  // Fetch users
  const { data: usersData, loading: usersLoading } = useApi<{ users: any[] }>("/api/users")

  const locations = locationsData?.locations || []
  const companies = companiesData?.companies || []
  const users = usersData?.users || []

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalLocations = locations.length
    const activeLocations = locations.filter((loc: any) => loc.isActive).length
    const inactiveLocations = totalLocations - activeLocations
    const totalItems = locations.reduce((sum: number, loc: any) => sum + (loc._count?.items || 0), 0)
    const locationsWithManagers = locations.filter((loc: any) => loc.managerId).length

    return {
      totalLocations,
      activeLocations,
      inactiveLocations,
      totalItems,
      locationsWithManagers,
    }
  }, [locations])

  const handleEdit = (location: any) => {
    setSelectedLocation(location)
    setIsFormOpen(true)
  }

  const handleAdd = () => {
    setSelectedLocation(undefined)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setSelectedLocation(null)
  }

  const handleFormSuccess = () => {
    refreshLocations()
    handleFormClose()
  }

  if (locationsError) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
            <p className="text-muted-foreground">Manage your business locations and storage facilities.</p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading locations: {locationsError}</p>
          <Button onClick={refreshLocations}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-muted-foreground">Manage your business locations and storage facilities.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.totalLocations}</div>
                <p className="text-xs text-muted-foreground">
                  {metrics.activeLocations} active, {metrics.inactiveLocations} inactive
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Locations</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.activeLocations}</div>
                <p className="text-xs text-muted-foreground">Currently in use</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.totalItems}</div>
                <p className="text-xs text-muted-foreground">Across all locations</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Managers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {locationsLoading ? (
              <Skeleton className="h-8 w-full" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics.locationsWithManagers}</div>
                <p className="text-xs text-muted-foreground">Locations with assigned managers</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Data Table */}
      <LocationDataTable 
        locations={locations}
        onEdit={handleEdit}
        onRefresh={refreshLocations}
      />

      {/* Form Dialog */}
      <LocationFormDialog
        isOpen={isFormOpen}
        onClose={handleFormClose}
        location={selectedLocation}
        companies={companies}
        users={users}
        onSuccess={handleFormSuccess}
      />
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
