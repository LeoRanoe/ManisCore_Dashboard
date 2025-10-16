"use client"

import { useState, useEffect, useCallback } from "react"
import { Plus, Search, Star, Pencil, Trash2, Upload } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useCompany } from "../../../contexts/company-context"
import { ImageUpload } from "@/components/ui/image-upload"

interface Testimonial {
  id: string
  customerName: string
  customerRole?: string | null
  content: string
  rating: number
  imageUrl?: string | null
  isFeatured: boolean
  order: number
  createdAt: string
  companyId: string
}

function TestimonialsPage() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTestimonial, setEditingTestimonial] = useState<Testimonial | undefined>()
  const [deleteTestimonial, setDeleteTestimonial] = useState<Testimonial | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const { selectedCompany } = useCompany()

  const [formData, setFormData] = useState({
    customerName: "",
    customerRole: "",
    content: "",
    rating: 5,
    imageUrl: "",
    isFeatured: false,
    order: 0,
  })

  const fetchTestimonials = useCallback(async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const response = await fetch(`/api/testimonials?companyId=${selectedCompany}`)
      if (!response.ok) {
        throw new Error("Failed to fetch testimonials")
      }
      const data = await response.json()
      setTestimonials(data.testimonials || [])
    } catch (error) {
      console.error("Error fetching testimonials:", error)
      toast({
        title: "Error",
        description: "Failed to load testimonials",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCompany, toast])

  useEffect(() => {
    fetchTestimonials()
  }, [fetchTestimonials])

  const handleEdit = (testimonial: Testimonial) => {
    setEditingTestimonial(testimonial)
    setFormData({
      customerName: testimonial.customerName,
      customerRole: testimonial.customerRole || "",
      content: testimonial.content,
      rating: testimonial.rating,
      imageUrl: testimonial.imageUrl || "",
      isFeatured: testimonial.isFeatured,
      order: testimonial.order,
    })
    setIsFormOpen(true)
  }

  const handleFormClose = () => {
    setIsFormOpen(false)
    setEditingTestimonial(undefined)
    setFormData({
      customerName: "",
      customerRole: "",
      content: "",
      rating: 5,
      imageUrl: "",
      isFeatured: false,
      order: 0,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCompany) return

    setSaving(true)
    try {
      const url = editingTestimonial
        ? `/api/testimonials/${editingTestimonial.id}`
        : `/api/testimonials`

      const method = editingTestimonial ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          companyId: selectedCompany,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save testimonial")
      }

      toast({
        title: "Success",
        description: `Testimonial ${editingTestimonial ? "updated" : "created"} successfully`,
      })

      fetchTestimonials()
      handleFormClose()
    } catch (error) {
      console.error("Error saving testimonial:", error)
      toast({
        title: "Error",
        description: "Failed to save testimonial",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTestimonial) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/testimonials/${deleteTestimonial.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to delete testimonial")
      }

      toast({
        title: "Success",
        description: "Testimonial deleted successfully",
      })

      fetchTestimonials()
      setDeleteTestimonial(null)
    } catch (error) {
      console.error("Error deleting testimonial:", error)
      toast({
        title: "Error",
        description: "Failed to delete testimonial",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredTestimonials = testimonials.filter((testimonial) =>
    testimonial.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    testimonial.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    )
  }

  if (!selectedCompany) {
    return (
      <DashboardLayout>
        <div className="space-y-6 p-4 md:p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                No Company Selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please select a company from the dropdown to manage testimonials.
              </p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Testimonials</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage customer testimonials
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Testimonial
        </Button>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search testimonials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Testimonials Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredTestimonials.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Star className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No testimonials found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Get started by adding your first testimonial.
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Testimonial
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Rating</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Content</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Order</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTestimonials.map((testimonial) => (
                  <TableRow key={testimonial.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {testimonial.imageUrl && (
                          <img
                            src={testimonial.imageUrl}
                            alt={testimonial.customerName}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">{testimonial.customerName}</p>
                          {testimonial.customerRole && (
                            <p className="text-xs text-muted-foreground">
                              {testimonial.customerRole}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderStars(testimonial.rating)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-md">
                      <p className="text-sm line-clamp-2">{testimonial.content}</p>
                    </TableCell>
                    <TableCell>
                      {testimonial.isFeatured && (
                        <Badge variant="default">Featured</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{testimonial.order}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(testimonial)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteTestimonial(testimonial)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={handleFormClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTestimonial ? "Edit Testimonial" : "Add Testimonial"}
            </DialogTitle>
            <DialogDescription>
              {editingTestimonial
                ? "Update the testimonial details below."
                : "Add a new customer testimonial to your website."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customerRole">Customer Role/Title</Label>
                <Input
                  id="customerRole"
                  placeholder="e.g., CEO, Customer, etc."
                  value={formData.customerRole}
                  onChange={(e) =>
                    setFormData({ ...formData, customerRole: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Testimonial Content *</Label>
                <Textarea
                  id="content"
                  rows={4}
                  value={formData.content}
                  onChange={(e) =>
                    setFormData({ ...formData, content: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rating">Rating *</Label>
                <select
                  id="rating"
                  value={formData.rating}
                  onChange={(e) =>
                    setFormData({ ...formData, rating: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUrl">Customer Image URL</Label>
                <Input
                  id="imageUrl"
                  type="url"
                  placeholder="https://..."
                  value={formData.imageUrl}
                  onChange={(e) =>
                    setFormData({ ...formData, imageUrl: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Add a URL to the customer's photo
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Display Order</Label>
                <Input
                  id="order"
                  type="number"
                  min="0"
                  value={formData.order}
                  onChange={(e) =>
                    setFormData({ ...formData, order: Number(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Lower numbers appear first
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onChange={(e) =>
                    setFormData({ ...formData, isFeatured: e.target.checked })
                  }
                  className="rounded"
                />
                <Label htmlFor="isFeatured" className="cursor-pointer">
                  Mark as Featured (display prominently)
                </Label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleFormClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editingTestimonial ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTestimonial} onOpenChange={() => setDeleteTestimonial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the testimonial from "{deleteTestimonial?.customerName}".
              This action cannot be undone.
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
    </div>
  )
}

// Wrap with DashboardLayout
export default function TestimonialsPageWithLayout() {
  return (
    <DashboardLayout>
      <TestimonialsPage />
    </DashboardLayout>
  )
}
