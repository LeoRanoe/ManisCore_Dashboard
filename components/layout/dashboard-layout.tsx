import Link from 'next/link'
import { BarChart3, Package, Moon, Sun, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 bg-card border-r border-border">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b border-border">
            <Package className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-xl font-bold text-foreground">ManisCor</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6">
            <div className="space-y-2">
              <Link href="/dashboard" className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <BarChart3 className="h-5 w-5 mr-3" />
                Dashboard
              </Link>
              <Link href="/inventory" className="flex items-center px-4 py-2 text-sm font-medium rounded-lg text-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <Package className="h-5 w-5 mr-3" />
                Inventory
              </Link>
            </div>
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-border">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-foreground">Inventory Management</h2>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon">
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}