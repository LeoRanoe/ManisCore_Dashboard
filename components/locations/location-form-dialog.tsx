"use client"

import { useState, useEffect, useCallback, memo } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { LocationFormSchema, type LocationFormData } from "@/lib/validations"

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

interface LocationFormDialogProps {
  isOpen: boolean
  onClose: () => void
  location?: Location
  companies: Company[]
  users: User[]
  onSuccess: () => void
}

export function LocationFormDialog({
  isOpen,
  onClose,
  location,
  companies,
  users,
  onSuccess,
}: LocationFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LocationFormData>({
    resolver: zodResolver(LocationFormSchema),
    defaultValues: location ? {
      name: location.name,
      address: location.address || "",
      description: location.description || "",
      isActive: location.isActive,
      companyId: location.companyId,
      managerId: location.managerId || "",
    } : {
      isActive: true,
    },
  })

  const handleFormSubmit = async (data: LocationFormData) => {
    setIsLoading(true)
    try {
      // Remove empty optional fields
      const cleanData = {
        ...data,
        address: data.address || undefined,
        description: data.description || undefined,
        managerId: data.managerId && data.managerId !== "none" ? data.managerId : undefined,
      }

      const url = location ? `/api/locations/${location.id}` : "/api/locations"
      const method = location ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save location")
      }

      toast({
        title: "Success",
        description: `Location ${location ? "updated" : "created"} successfully`,
      })

      reset()
      onSuccess()
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

  // Filter users by selected company
  const selectedCompanyId = watch("companyId")
  const filteredUsers = users.filter(user => 
    !selectedCompanyId || user.companyId === selectedCompanyId
  )

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{location ? "Edit Location" : "Add New Location"}</DialogTitle>
          <DialogDescription>
            {location ? "Update location information" : "Add a new storage location to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Aryan's Storage"
                className="w-full"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyId">Company *</Label>
              <Select
                onValueChange={(value) => {
                  setValue("companyId", value)
                  // Clear manager when company changes
                  setValue("managerId", "")
                }}
                defaultValue={watch("companyId")}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="Physical address (optional)"
              className="w-full"
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="managerId">Manager</Label>
            <Select
              onValueChange={(value) => setValue("managerId", value)}
              defaultValue={watch("managerId")}
              disabled={!selectedCompanyId}
            >
              <SelectTrigger>
                <SelectValue placeholder={selectedCompanyId ? "Select manager" : "Select company first"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No manager assigned</SelectItem>
                {filteredUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.managerId && (
              <p className="text-sm text-red-500">{errors.managerId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              placeholder="Additional notes about this location (optional)"
              rows={3}
              className="w-full"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <input
              id="isActive"
              type="checkbox"
              {...register("isActive")}
              className="rounded"
            />
            <Label htmlFor="isActive">Active Location</Label>
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
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? "Saving..." : location ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}