"use client"

import { useState } from "react"
import { Plus, Search, X, Users } from "lucide-react"
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
import { UserDataTable } from "@/components/users/user-data-table"
import { UserFormDialog } from "@/components/users/user-form-dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useUsers } from "@/lib/hooks"
import { useCompany } from "../../../contexts/company-context"

interface User {
  id: string
  name: string
  email: string
  role: "ADMIN" | "MANAGER" | "STAFF"
  isActive: boolean
  companyId: string | null
  company: {
    id: string
    name: string
  } | null
  _count: {
    items: number
    locations: number
  }
}

function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  // Use dynamic hooks for automatic company filtering and error handling
  const { 
    data: usersData, 
    loading: usersLoading, 
    error: usersError,
    refresh: refreshUsers 
  } = useUsers()

  const { selectedCompany, companies, loading: companyLoading } = useCompany()

  // Filter users based on search and other filters
  const filteredUsers = (usersData?.users || []).filter((user: User) => {
    const matchesSearch = !searchQuery || 
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" ? user.isActive : !user.isActive)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const loading = usersLoading || companyLoading

  const handleEdit = (user: User) => {
    setEditingUser(user)
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingUser(undefined)
  }

  const handleFormSuccess = () => {
    refreshUsers()
    handleFormClose()
  }

  const clearFilters = () => {
    setSearchQuery("")
    setRoleFilter("all")
    setStatusFilter("all")
  }

  const hasActiveFilters = searchQuery || 
    roleFilter !== "all" ||
    statusFilter !== "all"

  // Error state
  if (usersError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users</h1>
            <p className="text-muted-foreground">
              Manage your team members and their access levels.
              {selectedCompany !== "all" && (
                <span className="block text-sm">
                  Filtered by: {companies.find(c => c.id === selectedCompany)?.name}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">Error loading users: {usersError}</p>
          <Button onClick={refreshUsers}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage system users and their roles
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Search</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:w-auto">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
                <SelectItem value="MANAGER">Manager</SelectItem>
                <SelectItem value="STAFF">Staff</SelectItem>
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

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <UserDataTable
            users={filteredUsers}
            onEdit={handleEdit}
            onRefresh={refreshUsers}
          />
        )}
      </div>

      {/* Form Dialog */}
      <UserFormDialog
        isOpen={isFormOpen}
        onClose={handleFormClose}
        user={editingUser}
        companies={companies}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}

// Wrap with DashboardLayout
export default function UsersPageWithLayout() {
  return (
    <DashboardLayout>
      <UsersPage />
    </DashboardLayout>
  )
}