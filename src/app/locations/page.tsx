"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, X, MapPin } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LocationDataTable } from "@/components/locations/location-data-table"
import { LocationFormDialog } from "@/components/locations/location-form-dialog"
import { Skeleton } from "@/components/ui/skeleton"

interface Location {
  id: string
  name: string
  address?: string
  description?: string
  isActive: boolean
  companyId: string
  managerId?: string
  company: {
    id: string
    name: string
  }
  manager?: {
    id: string
    name: string
    email: string
  }
  _count: {
    items: number
  }
}

interface Company {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
  companyId: string
}

function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [companyFilter, setCompanyFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | undefined>()

  const fetchLocations = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      
      if (companyFilter && companyFilter !== "all") {
        params.append("companyId", companyFilter)
      }
      
      if (statusFilter && statusFilter !== "all") {
        params.append("isActive", statusFilter === "active" ? "true" : "false")
      }

      const response = await fetch(`/api/locations?${params}`)
      if (!response.ok) {
        throw new Error("Failed to fetch locations")
      }
      const data = await response.json()
      
      // Filter by search query on the client side
      let filteredLocations = data.locations || []
      
      if (searchQuery) {
        filteredLocations = filteredLocations.filter((location: Location) =>
          location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (location.address && location.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (location.description && location.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      }
      
      setLocations(filteredLocations)
    } catch (error) {
      console.error("Error fetching locations:", error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery, companyFilter, statusFilter])

  const fetchCompanies = useCallback(async () => {
    try {
      const response = await fetch("/api/companies")
      if (!response.ok) {
        throw new Error("Failed to fetch companies")
      }
      const data = await response.json()
      setCompanies(data || [])
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch("/api/users")
      if (!response.ok) {
        throw new Error("Failed to fetch users")
      }
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error("Error fetching users:", error)
    }
  }, [])

  useEffect(() => {
    fetchLocations()
    fetchCompanies()
    fetchUsers()
  }, [fetchLocations, fetchCompanies, fetchUsers])

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingLocation(undefined)
  }

  const handleFormSuccess = () => {
    fetchLocations()
  }

  const clearFilters = () => {
    setSearchQuery("")
    setCompanyFilter("all")
    setStatusFilter("all")
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Locations</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage storage locations and stock distribution
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name, address, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium">Company</label>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-end">
          <Button
            variant="outline"
            size="sm"
            onClick={clearFilters}
            className="whitespace-nowrap"
          >
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      {/* Locations Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <LocationDataTable
            locations={locations}
            onEdit={handleEdit}
            onRefresh={fetchLocations}
          />
        )}
      </div>

      {/* Form Dialog */}
      <LocationFormDialog
        isOpen={isFormOpen}
        onClose={handleFormClose}
        location={editingLocation}
        companies={companies}
        users={users}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}

// Wrap with DashboardLayout
export default function LocationsPageWithLayout() {
  return (
    <DashboardLayout>
      <LocationsPage />
    </DashboardLayout>
  )
}