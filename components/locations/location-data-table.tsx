"use client"

import { useState } from "react"
import { MoreHorizontal, Pencil, Trash2, MapPin, User, Building2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"

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

interface LocationDataTableProps {
  locations: Location[]
  onEdit: (location: Location) => void
  onRefresh: () => void
}

export function LocationDataTable({ locations, onEdit, onRefresh }: LocationDataTableProps) {
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()

  const handleDelete = async () => {
    if (!deleteLocation) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/locations/${deleteLocation.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete location")
      }

      toast({
        title: "Success",
        description: "Location deleted successfully",
      })

      onRefresh()
      setDeleteLocation(null)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete location",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (locations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <MapPin className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          No locations found
        </h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">
          Get started by adding your first storage location.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 dark:bg-gray-800">
                <TableHead className="font-semibold">Location</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Company</TableHead>
                <TableHead className="font-semibold hidden lg:table-cell">Manager</TableHead>
                <TableHead className="font-semibold hidden sm:table-cell">Status</TableHead>
                <TableHead className="font-semibold hidden md:table-cell">Items</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {location.name}
                        </span>
                      </div>
                      {location.address && (
                        <div className="text-sm text-gray-500 ml-6">
                          {location.address}
                        </div>
                      )}
                      {location.description && (
                        <div className="text-sm text-gray-500 ml-6 mt-1">
                          {location.description}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2 sm:hidden">
                        <Badge variant={location.isActive ? "default" : "secondary"} className="text-xs">
                          {location.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 md:hidden">
                        {location.company.name} • Items: {location._count.items}
                        {location.manager && ` • Manager: ${location.manager.name}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">
                        {location.company.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {location.manager ? (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <div className="flex flex-col">
                          <span className="text-sm font-medium">
                            {location.manager.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {location.manager.email}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No manager assigned</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <Badge variant={location.isActive ? "default" : "secondary"}>
                      {location.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm font-medium">
                      {location._count.items}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(location)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteLocation(location)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!deleteLocation} onOpenChange={() => setDeleteLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the location
              "{deleteLocation?.name}" and remove all associated data.
              {(deleteLocation?._count?.items ?? 0) > 0 && (
                <span className="block mt-2 text-orange-600 font-medium">
                  Warning: This location has {deleteLocation?._count?.items ?? 0} items assigned to it.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}