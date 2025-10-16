import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"

// Fetch users by company
export function useUsers(companyId?: string) {
  return useQuery({
    queryKey: ['users', companyId],
    queryFn: async () => {
      if (!companyId) return { users: [] }
      const response = await fetch(`/api/users?companyId=${companyId}`)
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json()
    },
    enabled: !!companyId,
  })
}

// Fetch locations by company
export function useLocations(companyId?: string) {
  return useQuery({
    queryKey: ['locations', companyId],
    queryFn: async () => {
      if (!companyId) return { locations: [] }
      const response = await fetch(`/api/locations?companyId=${companyId}`)
      if (!response.ok) throw new Error('Failed to fetch locations')
      return response.json()
    },
    enabled: !!companyId,
  })
}

// Fetch all locations
export function useAllLocations() {
  return useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await fetch('/api/locations')
      if (!response.ok) throw new Error('Failed to fetch locations')
      return response.json()
    },
  })
}

// Fetch all users
export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      return response.json()
    },
  })
}

// Fetch companies
export function useCompanies() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const response = await fetch('/api/companies')
      if (!response.ok) throw new Error('Failed to fetch companies')
      return response.json()
    },
  })
}
