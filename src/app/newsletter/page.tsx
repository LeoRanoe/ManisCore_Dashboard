"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Mail, Download, Trash2, Calendar } from "lucide-react"
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

interface Subscriber {
  id: string
  email: string
  isActive: boolean
  createdAt: string
  companyId: string
}

function NewsletterPage() {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteSubscriber, setDeleteSubscriber] = useState<Subscriber | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const { toast } = useToast()
  const { selectedCompany } = useCompany()

  const fetchSubscribers = useCallback(async () => {
    if (!selectedCompany) return

    setLoading(true)
    try {
      const response = await fetch(`/api/newsletter?companyId=${selectedCompany}`)
      if (!response.ok) {
        throw new Error("Failed to fetch subscribers")
      }
      const data = await response.json()
      setSubscribers(data.subscribers || [])
    } catch (error) {
      console.error("Error fetching subscribers:", error)
      toast({
        title: "Error",
        description: "Failed to load subscribers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [selectedCompany, toast])

  useEffect(() => {
    fetchSubscribers()
  }, [fetchSubscribers])

  const handleDelete = async () => {
    if (!deleteSubscriber) return

    setIsDeleting(true)
    try {
      const response = await fetch(`/api/newsletter/${deleteSubscriber.id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Failed to unsubscribe")
      }

      toast({
        title: "Success",
        description: "Subscriber removed successfully",
      })

      fetchSubscribers()
      setDeleteSubscriber(null)
    } catch (error) {
      console.error("Error deleting subscriber:", error)
      toast({
        title: "Error",
        description: "Failed to remove subscriber",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleExportCSV = () => {
    const csvContent = [
      ["Email", "Status", "Subscribed Date"],
      ...filteredSubscribers.map(sub => [
        sub.email,
        sub.isActive ? "Active" : "Inactive",
        new Date(sub.createdAt).toLocaleDateString()
      ])
    ]
      .map(row => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Success",
      description: "Subscribers exported to CSV",
    })
  }

  const filteredSubscribers = subscribers.filter((subscriber) =>
    subscriber.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const stats = {
    total: subscribers.length,
    active: subscribers.filter(s => s.isActive).length,
    inactive: subscribers.filter(s => !s.isActive).length,
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
                Please select a company from the dropdown to view newsletter subscribers.
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
          <h1 className="text-3xl font-bold tracking-tight">Newsletter Subscribers</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your email newsletter subscribers
          </p>
        </div>
        <Button onClick={handleExportCSV} disabled={subscribers.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Subscribers</p>
              <p className="text-3xl font-bold mt-2">{stats.total}</p>
            </div>
            <Mail className="h-12 w-12 text-blue-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="text-3xl font-bold mt-2 text-green-600">{stats.active}</p>
            </div>
            <Mail className="h-12 w-12 text-green-500 opacity-20" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-6 rounded-lg shadow border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Inactive</p>
              <p className="text-3xl font-bold mt-2 text-gray-600">{stats.inactive}</p>
            </div>
            <Mail className="h-12 w-12 text-gray-500 opacity-20" />
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-sm">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Subscribers Table */}
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow border">
        {loading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No subscribers found
            </h3>
            <p className="text-gray-500 dark:text-gray-400">
              Subscribers will appear here when they sign up for your newsletter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-800">
                  <TableHead className="font-semibold">Email</TableHead>
                  <TableHead className="font-semibold hidden md:table-cell">Status</TableHead>
                  <TableHead className="font-semibold hidden lg:table-cell">Subscribed Date</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscribers.map((subscriber) => (
                  <TableRow key={subscriber.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{subscriber.email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {subscriber.isActive ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(subscriber.createdAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteSubscriber(subscriber)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteSubscriber} onOpenChange={() => setDeleteSubscriber(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subscriber?</AlertDialogTitle>
            <AlertDialogDescription>
              This will unsubscribe "{deleteSubscriber?.email}" from the newsletter.
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
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// Wrap with DashboardLayout
export default function NewsletterPageWithLayout() {
  return (
    <DashboardLayout>
      <NewsletterPage />
    </DashboardLayout>
  )
}
