"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { BarChart3, Package, Settings, Users, MapPin, Building2, Menu, X, DollarSign, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from '@/lib/utils'
import { useCompany } from '../../contexts/company-context'
import { ThemeToggle } from '../theme-toggle'
import { signOut } from 'next-auth/react'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { selectedCompany, setSelectedCompany, companies } = useCompany()

  const navItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: BarChart3
    },
    {
      href: '/inventory',
      label: 'Inventory',
      icon: Package,
      subItems: [
        { href: '/inventory', label: 'Overview' },
        { href: '/inventory/stock', label: 'Stock Management' },
        { href: '/inventory/locations', label: 'Locations' },
        { href: '/inventory/orders', label: 'Orders' }
      ]
    },
    {
      href: '/expenses',
      label: 'Expenses',
      icon: DollarSign
    },
    {
      href: '/companies',
      label: 'Companies',
      icon: Building2
    },
    {
      href: '/users',
      label: 'Users',
      icon: Users
    },
    {
      href: '/locations',
      label: 'Locations',
      icon: MapPin
    }
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Hidden on mobile, slide in when menu is open */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-primary mr-3" />
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-foreground">ManisCore</h1>
              <span className="text-xs text-muted-foreground">Business Management Platform</span>
            </div>
          </div>
          {/* Mobile menu close button */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Company Selector */}
        <div className="px-4 py-4 border-b border-border">
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Select Company
            </label>
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-full">
                <div className="flex items-center">
                  <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Select company" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6">
          <div className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || (item.subItems && item.subItems.some(subItem => pathname === subItem.href))
              const isExpanded = pathname.startsWith(item.href)
              
              return (
                <div key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)} // Close mobile menu on nav
                    className={cn(
                      "flex items-center px-3 py-3 text-sm font-medium rounded-md transition-colors", // Larger touch targets
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 mr-3" />
                    {item.label}
                  </Link>
                  
                  {/* Sub-navigation */}
                  {item.subItems && isExpanded && (
                    <div className="ml-8 mt-1 space-y-1">
                      {item.subItems.map((subItem) => {
                        const isSubActive = pathname === subItem.href
                        return (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={cn(
                              "block px-3 py-2 text-sm rounded-md transition-colors",
                              isSubActive
                                ? "bg-accent text-accent-foreground font-medium"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            {subItem.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-border space-y-2">
          <Button variant="ghost" size="sm" className="w-full justify-start h-12"> {/* Larger for mobile */}
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => signOut({ callbackUrl: '/login' })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0"> {/* Remove margin on mobile */}
        {/* Header */}
        <header className="bg-card border-b border-border px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mobile menu button */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <div>
                <h2 className="text-lg md:text-2xl font-semibold text-foreground">
                  Company Management
                </h2>
                {selectedCompany !== "all" && (
                  <div className="hidden md:flex items-center text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 mr-1" />
                    {companies.find(c => c.id === selectedCompany)?.name}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}