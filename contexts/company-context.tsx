"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'

interface Company {
  id: string
  name: string
  cashBalanceUSD?: number
}

interface CompanyContextType {
  selectedCompany: string
  setSelectedCompany: (companyId: string) => void
  companies: Company[]
  loading: boolean
  error: string | null
  refreshCompanies: () => Promise<void>
  retry: () => void
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined)

export function useCompany() {
  const context = useContext(CompanyContext)
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider')
  }
  return context
}

interface CompanyProviderProps {
  children: ReactNode
}

export function CompanyProvider({ children }: CompanyProviderProps) {
  const [selectedCompany, setSelectedCompany] = useState<string>("all")
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const fetchCompanies = useCallback(async (isRetry = false) => {
    try {
      if (!isRetry) setLoading(true)
      setError(null)
      
      const response = await fetch("/api/companies")
      if (!response.ok) {
        throw new Error(`Failed to fetch companies: ${response.status}`)
      }
      
      const data = await response.json()
      const companiesData = data || []
      
      // Fetch financial data for each company
      const companiesWithFinancials = await Promise.all(
        companiesData.map(async (company: Company) => {
          try {
            const financialResponse = await fetch(`/api/companies/${company.id}/financial`)
            if (financialResponse.ok) {
              const financialData = await financialResponse.json()
              return { ...company, cashBalanceUSD: financialData.cashBalanceUSD }
            }
            return company
          } catch (error) {
            console.warn(`Failed to fetch financial data for ${company.name}:`, error)
            return company
          }
        })
      )
      
      setCompanies(companiesWithFinancials)
      setRetryCount(0)
    } catch (error) {
      console.error("Error fetching companies:", error)
      setError(error instanceof Error ? error.message : "Failed to fetch companies")
      
      // Auto-retry up to 3 times with exponential backoff
      if (retryCount < 3) {
        setTimeout(() => {
          setRetryCount(prev => prev + 1)
          fetchCompanies(true)
        }, Math.pow(2, retryCount) * 1000)
      }
    } finally {
      setLoading(false)
    }
  }, [retryCount])

  const retry = useCallback(() => {
    setRetryCount(0)
    fetchCompanies()
  }, [fetchCompanies])

  // Auto-select first company if none selected and companies are loaded
  useEffect(() => {
    if (companies.length > 0 && selectedCompany === "all") {
      // Keep "all" as default for global view, but this can be changed based on requirements
    }
  }, [companies, selectedCompany])

  useEffect(() => {
    fetchCompanies()
  }, [fetchCompanies])

  const value: CompanyContextType = {
    selectedCompany,
    setSelectedCompany,
    companies,
    loading,
    error,
    refreshCompanies: () => fetchCompanies(),
    retry,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}