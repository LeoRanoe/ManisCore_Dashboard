"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface CompanyContextType {
  selectedCompany: string
  setSelectedCompany: (companyId: string) => void
  companies: Array<{ id: string; name: string }>
  refreshCompanies: () => void
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
  const [companies, setCompanies] = useState<Array<{ id: string; name: string }>>([])

  const fetchCompanies = async () => {
    try {
      const response = await fetch("/api/companies")
      if (response.ok) {
        const data = await response.json()
        setCompanies(data || [])
      }
    } catch (error) {
      console.error("Error fetching companies:", error)
    }
  }

  useEffect(() => {
    fetchCompanies()
  }, [])

  const value = {
    selectedCompany,
    setSelectedCompany,
    companies,
    refreshCompanies: fetchCompanies,
  }

  return (
    <CompanyContext.Provider value={value}>
      {children}
    </CompanyContext.Provider>
  )
}