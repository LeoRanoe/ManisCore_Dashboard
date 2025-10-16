"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, MapPin, Package, RefreshCw } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

interface StockBatch {
  id: string
  itemId: string
  locationId?: string | null
  quantity: number
  status: string
  item?: {
    id: string
    name: string
    company?: {
      id: string
      name: string
    }
  }
  location?: {
    id: string
    name: string
  } | null
}

interface LocationStock {
  locationId: string
  locationName: string
  totalQuantity: number
  totalBatches: number
  items: {
    itemId: string
    itemName: string
    companyName: string
    quantity: number
    batchCount: number
  }[]
}

export default function LocationStockPage() {
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [locationStocks, setLocationStocks] = useState<LocationStock[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/batches?limit=10000")
      if (!response.ok) {
        throw new Error("Failed to fetch batches")
      }
      const data = await response.json()
      setBatches(data.batches || [])
      aggregateLocationStock(data.batches || [])
    } catch (error) {
      console.error("Error fetching batches:", error)
      toast({
        title: "Error",
        description: "Failed to load stock data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const aggregateLocationStock = (batchData: StockBatch[]) => {
    // Only include batches that have arrived or are in stock (not sold)
    const availableBatches = batchData.filter(
      (batch) => batch.status === "Arrived" && batch.locationId
    )

    // Group by location
    const locationMap = new Map<string, LocationStock>()

    availableBatches.forEach((batch) => {
      if (!batch.location) return

      const locationId = batch.location.id
      const locationName = batch.location.name

      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          locationId,
          locationName,
          totalQuantity: 0,
          totalBatches: 0,
          items: [],
        })
      }

      const locationStock = locationMap.get(locationId)!
      locationStock.totalQuantity += batch.quantity
      locationStock.totalBatches += 1

      // Find or create item entry
      const itemId = batch.item?.id || batch.itemId
      const itemName = batch.item?.name || "Unknown Item"
      const companyName = batch.item?.company?.name || "-"

      const existingItem = locationStock.items.find((i) => i.itemId === itemId)
      if (existingItem) {
        existingItem.quantity += batch.quantity
        existingItem.batchCount += 1
      } else {
        locationStock.items.push({
          itemId,
          itemName,
          companyName,
          quantity: batch.quantity,
          batchCount: 1,
        })
      }
    })

    // Convert to array and sort by total quantity descending
    const stocksArray = Array.from(locationMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    )

    // Sort items within each location
    stocksArray.forEach((stock) => {
      stock.items.sort((a, b) => b.quantity - a.quantity)
    })

    setLocationStocks(stocksArray)
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  const totalStock = locationStocks.reduce((sum, loc) => sum + loc.totalQuantity, 0)
  const totalLocations = locationStocks.length
  const totalBatches = locationStocks.reduce((sum, loc) => sum + loc.totalBatches, 0)

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/inventory">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Inventory
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Stock by Location</h1>
              <p className="text-muted-foreground">
                View inventory levels across all locations
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={fetchBatches} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalLocations}</div>
              <p className="text-xs text-muted-foreground">Active storage locations</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStock}</div>
              <p className="text-xs text-muted-foreground">Units in stock</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Batches</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalBatches}</div>
              <p className="text-xs text-muted-foreground">Active stock batches</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="text-center py-8">Loading location stock data...</div>
        ) : locationStocks.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <p>No stock found in any location. Add stock batches to see data here.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {locationStocks.map((locationStock) => (
              <Card key={locationStock.locationId}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <CardTitle className="text-xl">{locationStock.locationName}</CardTitle>
                    </div>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>
                        <strong className="text-lg text-foreground">{locationStock.totalQuantity}</strong> units
                      </span>
                      <span>
                        <strong className="text-lg text-foreground">{locationStock.totalBatches}</strong> batches
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item Name</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead>Quantity</TableHead>
                          <TableHead>Batches</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {locationStock.items.map((item) => (
                          <TableRow key={item.itemId}>
                            <TableCell className="font-medium">{item.itemName}</TableCell>
                            <TableCell>{item.companyName}</TableCell>
                            <TableCell>
                              <span className="font-semibold">{item.quantity}</span> units
                            </TableCell>
                            <TableCell>
                              <span className="text-muted-foreground">
                                {item.batchCount} {item.batchCount === 1 ? "batch" : "batches"}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
