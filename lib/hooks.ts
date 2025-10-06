"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCompany } from '../contexts/company-context'
import { useToast } from '@/components/ui/use-toast'

interface UseApiOptions {
  enabled?: boolean
  retryCount?: number
  retryDelay?: number
  dependencies?: any[]
}

interface ApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  refresh: () => Promise<void>
}

// Generic hook for API calls with automatic error handling and retries
export function useApi<T>(
  url: string | (() => string),
  options: UseApiOptions = {}
): ApiState<T> {
  const {
    enabled = true,
    retryCount = 3,
    retryDelay = 1000,
    dependencies = []
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryAttempt = useRef(0)
  const { toast } = useToast()

  const fetchData = useCallback(async (showLoading = true) => {
    if (!enabled) return

    try {
      if (showLoading) setLoading(true)
      setError(null)

      const fetchUrl = typeof url === 'function' ? url() : url
      const response = await fetch(fetchUrl)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      setData(result)
      retryAttempt.current = 0
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      console.error('API Error:', errorMessage)
      setError(errorMessage)

      // Auto-retry with exponential backoff
      if (retryAttempt.current < retryCount) {
        retryAttempt.current++
        setTimeout(() => {
          fetchData(false)
        }, retryDelay * Math.pow(2, retryAttempt.current - 1))
      } else {
        toast({
          title: "Error",
          description: `Failed to load data: ${errorMessage}`,
          variant: "destructive",
        })
      }
    } finally {
      setLoading(false)
    }
  }, [url, enabled, retryCount, retryDelay, toast])

  const refresh = useCallback(() => fetchData(true), [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData, ...dependencies])

  return {
    data,
    loading,
    error,
    refetch: refresh,
    refresh
  }
}

// Hook for items with automatic company filtering
export function useItems(searchQuery = "", statusFilter = "all") {
  const { selectedCompany } = useCompany()

  const url = useCallback(() => {
    const params = new URLSearchParams()
    
    if (searchQuery) params.append('searchQuery', searchQuery)
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
    if (selectedCompany && selectedCompany !== 'all') params.append('companyId', selectedCompany)
    
    return `/api/items?${params.toString()}`
  }, [searchQuery, statusFilter, selectedCompany])

  return useApi<{ items: any[] }>(url, {
    dependencies: [selectedCompany, searchQuery, statusFilter]
  })
}

// Hook for locations with automatic company filtering
export function useLocations(searchQuery = "", statusFilter = "all") {
  const { selectedCompany } = useCompany()

  const url = useCallback(() => {
    const params = new URLSearchParams()
    
    if (selectedCompany && selectedCompany !== 'all') params.append('companyId', selectedCompany)
    if (statusFilter && statusFilter !== 'all') {
      params.append('isActive', statusFilter === 'active' ? 'true' : 'false')
    }
    
    return `/api/locations?${params.toString()}`
  }, [selectedCompany, statusFilter])

  const apiResult = useApi<{ locations: any[] }>(url, {
    dependencies: [selectedCompany, statusFilter]
  })

  // Client-side search filtering
  const filteredData = apiResult.data ? {
    ...apiResult.data,
    locations: searchQuery 
      ? apiResult.data.locations.filter((location: any) =>
          location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (location.address && location.address.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (location.description && location.description.toLowerCase().includes(searchQuery.toLowerCase()))
        )
      : apiResult.data.locations
  } : null

  return {
    ...apiResult,
    data: filteredData
  }
}

// Hook for users with automatic company filtering
export function useUsers() {
  const { selectedCompany } = useCompany()

  const url = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedCompany && selectedCompany !== 'all') params.append('companyId', selectedCompany)
    return `/api/users?${params.toString()}`
  }, [selectedCompany])

  return useApi<{ users: any[] }>(url, {
    dependencies: [selectedCompany]
  })
}

// Hook for expenses with automatic company filtering
export function useExpenses(searchQuery = "", statusFilter = "all") {
  const { selectedCompany } = useCompany()

  const url = useCallback(() => {
    const params = new URLSearchParams()
    
    if (searchQuery) params.append('searchQuery', searchQuery)
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
    if (selectedCompany && selectedCompany !== 'all') params.append('companyId', selectedCompany)
    
    return `/api/expenses?${params.toString()}`
  }, [searchQuery, statusFilter, selectedCompany])

  return useApi<{ expenses: any[] }>(url, {
    dependencies: [selectedCompany, searchQuery, statusFilter]
  })
}

// Hook for dashboard metrics with automatic company filtering
export function useDashboardMetrics() {
  const { selectedCompany } = useCompany()

  const url = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedCompany && selectedCompany !== 'all') params.append('companyId', selectedCompany)
    return `/api/dashboard-metrics?${params.toString()}`
  }, [selectedCompany])

  return useApi<any>(url, {
    dependencies: [selectedCompany]
  })
}

// Mutation hook for create, update, delete operations
export function useMutation<T = any>(
  mutationFn: (data: any) => Promise<Response>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: string) => void
    invalidateQueries?: (() => void)[]
  } = {}
) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  const mutate = useCallback(async (data: any) => {
    setLoading(true)
    setError(null)

    try {
      const response = await mutationFn(data)
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Invalidate related queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach(invalidate => invalidate())
      }

      if (options.onSuccess) {
        options.onSuccess(result)
      }

      toast({
        title: "Success",
        description: "Operation completed successfully",
      })

      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      
      if (options.onError) {
        options.onError(errorMessage)
      }

      toast({
        title: "Error",
        description: `Operation failed: ${errorMessage}`,
        variant: "destructive",
      })

      throw err
    } finally {
      setLoading(false)
    }
  }, [mutationFn, options, toast])

  return {
    mutate,
    loading,
    error
  }
}