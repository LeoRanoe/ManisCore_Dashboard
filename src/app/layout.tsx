import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { CompanyProvider } from '../../contexts/company-context'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'ManisCore Portfolio Management',
  description: 'Modern portfolio and inventory management platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CompanyProvider>
            {children}
          </CompanyProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}