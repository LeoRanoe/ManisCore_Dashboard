"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Star, Check, X, Eye, AlertCircle } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { useCompany } from "../../../contexts/company-context"

interface Review {
  id: string
  rating: number
  comment: string
  customerName: string
  customerEmail: string
  isVerified: boolean
  isPublic: boolean
  createdAt: string
  itemId: string
  item: {
    name: string
    slug: string
  }
  companyId: string
}

function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const { toast } = useToast()
  const { selectedCompany } = useCompany()

  const fetchReviews = useCallback(async () => {
    if (!selectedCompany) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/reviews?companyId=${selectedCompany}`)
      if (!response.ok) {
        throw new Error("Failed to fetch reviews")
      }
      const data = await response.json()
      setReviews(data.reviews || [])
    } catch (error) {
      console.error("Error fetching reviews:", error)
      toast({
        title: "Error",
        description: "Failed to load reviews",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCompany, toast])

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  const handleApprove = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: true }),
      })

      if (!response.ok) {
        throw new Error("Failed to approve review")
      }

      toast({
        title: "Success",
        description: "Review approved successfully",
      })

      fetchReviews()
    } catch (error) {
      console.error("Error approving review:", error)
      toast({
        title: "Error",
        description: "Failed to approve review",
        variant: "destructive",
      })
    }
  }

  const handleReject = async (reviewId: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isPublic: false }),
      })

      if (!response.ok) {
        throw new Error("Failed to reject review")
      }

      toast({
        title: "Success",
        description: "Review rejected",
      })

      fetchReviews()
    } catch (error) {
      console.error("Error rejecting review:", error)
      toast({
        title: "Error",
        description: "Failed to reject review",
        variant: "destructive",
      })
    }
  }

  const handleToggleVerified = async (reviewId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isVerified: !currentStatus }),
      })

      if (!response.ok) {
        throw new Error("Failed to update review")
      }

      toast({
        title: "Success",
        description: `Review ${!currentStatus ? "verified" : "unverified"}`,
      })

      fetchReviews()
    } catch (error) {
      console.error("Error updating review:", error)
      toast({
        title: "Error",
        description: "Failed to update review",
        variant: "destructive",
      })
    }
  }

  const filteredReviews = reviews.filter((review) => {
    const matchesSearch =
      review.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.comment.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !review.isPublic) ||
      (statusFilter === "approved" && review.isPublic) ||
      (statusFilter === "rejected" && !review.isPublic)

    return matchesSearch && matchesStatus
  })

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
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                No Company Selected
              </h3>
              <p className="text-gray-500 dark:text-gray-400">
                Please select a company from the dropdown to view reviews.
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
          <h1 className="text-3xl font-bold tracking-tight">Reviews</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage customer reviews and ratings
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 max-w-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search reviews..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Reviews</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reviews Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Eye className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No reviews found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {statusFilter === "all" 
                ? "Reviews will appear here when customers submit them."
                : `No ${statusFilter} reviews found.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="font-semibold">Product</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Rating</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Comment</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReviews.map((review) => (
                  <TableRow key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell>
                      <div>
                        <p className="font-medium">{review.item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{review.customerName}</p>
                        <p className="text-xs text-muted-foreground">{review.customerEmail}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {renderStars(review.rating)}
                      <p className="text-xs text-muted-foreground mt-1">
                        {review.rating}/5
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-md">
                      <p className="text-sm line-clamp-2">{review.comment}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={review.isPublic ? "default" : "secondary"}>
                          {review.isPublic ? "Approved" : "Pending"}
                        </Badge>
                        {review.isVerified && (
                          <Badge variant="outline" className="text-blue-600">
                            <Check className="h-3 w-3 mr-1" />
                            Verified
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {!review.isPublic && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(review.id)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        {review.isPublic && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(review.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleVerified(review.id, review.isVerified)}
                          title={review.isVerified ? "Unverify" : "Verify purchase"}
                        >
                          <Eye className="h-4 w-4" />
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
    </div>
  )
}

// Wrap with DashboardLayout
export default function ReviewsPageWithLayout() {
  return (
    <DashboardLayout>
      <ReviewsPage />
    </DashboardLayout>
  )
}
