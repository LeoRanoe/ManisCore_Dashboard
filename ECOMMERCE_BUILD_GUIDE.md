# 🛍️ E-Commerce Platform - Complete Build Guide

Build the entire e-commerce platform in a separate project. Just follow these steps!

---

## 🚀 Quick Start (5 minutes)

### Step 1: Create New Project

```bash
# Navigate to parent directory
cd ..

# Create Next.js project
npx create-next-app@latest maniscore-ecommerce --typescript --tailwind --app --eslint

# Navigate to project
cd maniscore-ecommerce

# Install dependencies
npm install swr embla-carousel-react lucide-react class-variance-authority clsx tailwind-merge react-hook-form @hookform/resolvers zod
```

### Step 2: Set Up Environment

Create `.env.local`:

```env
NEXT_PUBLIC_DASHBOARD_API_URL=http://localhost:3000
NEXT_PUBLIC_SITE_URL=http://localhost:3001
NEXT_PUBLIC_DEFAULT_COMPANY=nextx
```

Update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['public.blob.vercel-storage.com', 'img.youtube.com'],
  },
}

module.exports = nextConfig
```

---

## 📁 Project Structure

Create these folders:

```bash
mkdir -p src/app/\[company\]/products/\[slug\]
mkdir -p src/app/\[company\]/contact
mkdir -p src/app/\[company\]/about
mkdir -p src/components/catalog
mkdir -p src/components/product
mkdir -p src/components/contact
mkdir -p src/components/layout
mkdir -p src/lib/api
mkdir -p src/lib/themes
```

---

## 🔧 Core Files

### 1. API Client (`src/lib/api/client.ts`)

```typescript
export interface Company {
  id: string;
  slug: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  socialMedia?: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  themeConfig?: {
    primaryColor?: string;
    secondaryColor?: string;
    accentColor?: string;
  };
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  shortDescription?: string;
  imageUrls: string[];
  youtubeReviewUrls?: string[];
  specifications?: Record<string, string>;
  tags: string[];
  isFeatured: boolean;
  sellingPriceSRD: number;
  status: string;
  quantityInStock: number;
  seoTitle?: string;
  seoDescription?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class DashboardAPI {
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_DASHBOARD_API_URL || 'http://localhost:3000';
  }

  async getCompany(slug: string): Promise<Company> {
    const res = await fetch(`${this.baseURL}/api/public/companies/${slug}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) throw new Error('Company not found');
    return res.json();
  }

  async getProducts(
    companySlug: string,
    page = 1,
    limit = 20,
    filters: { search?: string; tags?: string[]; isFeatured?: boolean } = {}
  ): Promise<PaginatedResponse<Product>> {
    const params = new URLSearchParams({
      companySlug,
      page: String(page),
      limit: String(limit),
      ...(filters.search && { search: filters.search }),
      ...(filters.tags && { tags: filters.tags.join(',') }),
      ...(filters.isFeatured !== undefined && { isFeatured: String(filters.isFeatured) })
    });

    const res = await fetch(`${this.baseURL}/api/public/products?${params}`, {
      next: { revalidate: 60 }
    });
    if (!res.ok) throw new Error('Failed to fetch products');
    return res.json();
  }

  async getProduct(slug: string, companySlug: string): Promise<Product & { relatedProducts: Product[] }> {
    const res = await fetch(
      `${this.baseURL}/api/public/products/${slug}?companySlug=${companySlug}`,
      { next: { revalidate: 60 } }
    );
    if (!res.ok) throw new Error('Product not found');
    return res.json();
  }
}

export const api = new DashboardAPI();
```

---

## 🎨 Components

### 2. Product Card (`src/components/catalog/ProductCard.tsx`)

```typescript
import Image from 'next/image';
import Link from 'next/link';
import { Product } from '@/lib/api/client';
import { Tag, Eye } from 'lucide-react';

export function ProductCard({ product, companySlug }: { product: Product; companySlug: string }) {
  const inStock = product.status === 'Arrived' && product.quantityInStock > 0;

  return (
    <Link href={`/${companySlug}/products/${product.slug}`}>
      <div className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1">
        {/* Image Container with Overlay Effect */}
        <div className="relative aspect-square bg-gradient-to-br from-muted/50 to-muted overflow-hidden">
          {product.imageUrls[0] ? (
            <>
              <Image
                src={product.imageUrls[0]}
                alt={product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-500"
              />
              {/* Gradient Overlay on Hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              {/* Quick View Badge */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="bg-white/90 backdrop-blur-sm text-black px-4 py-2 rounded-full flex items-center gap-2 font-medium">
                  <Eye className="w-4 h-4" />
                  <span>Quick View</span>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center mb-2">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="text-sm">No Image</span>
            </div>
          )}
          
          {/* Featured Badge - Premium Look */}
          {product.isFeatured && (
            <div className="absolute top-3 left-3">
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>Featured</span>
              </div>
            </div>
          )}

          {/* Stock Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <div className={`backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg border ${
              inStock 
                ? 'bg-emerald-500/90 text-white border-emerald-400/50' 
                : 'bg-red-500/90 text-white border-red-400/50'
            }`}>
              {inStock ? `✓ ${product.quantityInStock} In Stock` : 'Out of Stock'}
            </div>
          </div>

          {/* Tags Preview */}
          {product.tags && product.tags.length > 0 && (
            <div className="absolute bottom-3 left-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {product.tags.slice(0, 2).map((tag, i) => (
                <span key={i} className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md flex items-center gap-1">
                  <Tag className="w-3 h-3" />
                  {tag}
                </span>
              ))}
              {product.tags.length > 2 && (
                <span className="bg-black/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-md">
                  +{product.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Info Section - Enhanced */}
        <div className="p-5 space-y-3">
          {/* Product Name */}
          <h3 className="font-bold text-lg line-clamp-2 group-hover:text-primary transition-colors min-h-[3.5rem]">
            {product.name}
          </h3>
          
          {/* Description */}
          {product.shortDescription && (
            <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
              {product.shortDescription}
            </p>
          )}
          
          {/* Price Section - Premium Design */}
          <div className="flex items-end justify-between pt-2 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Price</p>
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                SRD {product.sellingPriceSRD.toFixed(2)}
              </p>
            </div>
            
            {/* View Details Button */}
            <div className="bg-primary/10 text-primary px-4 py-2 rounded-lg font-medium text-sm group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              View Details
            </div>
          </div>
        </div>

        {/* Hover Glow Effect */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
      </div>
    </Link>
  );
}
```

### 3. WhatsApp Button (`src/components/contact/WhatsAppButton.tsx`)

```typescript
import { MessageCircle } from 'lucide-react';

export function WhatsAppButton({ 
  phone, 
  message = "Hi! I'm interested in your products.",
  className = ""
}: { 
  phone: string; 
  message?: string;
  className?: string;
}) {
  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group relative inline-flex items-center justify-center gap-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/50 hover:scale-105 overflow-hidden ${className}`}
    >
      {/* Animated Background Shine */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      {/* WhatsApp Icon with Pulse Animation */}
      <div className="relative">
        <div className="absolute inset-0 bg-white/30 rounded-full animate-ping" />
        <MessageCircle className="w-6 h-6 relative z-10" />
      </div>
      
      {/* Text */}
      <span className="relative z-10">Contact on WhatsApp</span>
      
      {/* Arrow Icon */}
      <svg 
        className="w-5 h-5 group-hover:translate-x-1 transition-transform relative z-10" 
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </a>
  );
}
```

### 4. YouTube Embed (`src/components/product/YouTubeEmbed.tsx`)

```typescript
export function YouTubeEmbed({ url }: { url: string }) {
  const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/)?.[1];

  if (!videoId) return null;

  return (
    <div className="aspect-video">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}`}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="w-full h-full rounded-lg"
      />
    </div>
  );
}
```

### 5. Navigation (`src/components/layout/Navigation.tsx`)

```typescript
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Company } from '@/lib/api/client';
import { Menu, X, ShoppingBag } from 'lucide-react';
import { useState } from 'react';

export function Navigation({ company, companySlug }: { company: Company; companySlug: string }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: `/${companySlug}`, label: 'Home' },
    { href: `/${companySlug}/products`, label: 'Products' },
    { href: `/${companySlug}/about`, label: 'About' },
    { href: `/${companySlug}/contact`, label: 'Contact' },
  ];

  const isActive = (href: string) => {
    if (href === `/${companySlug}`) {
      return pathname === href;
    }
    return pathname?.startsWith(href);
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50 shadow-lg shadow-black/5">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo Section - Enhanced */}
          <Link href={`/${companySlug}`} className="flex items-center gap-3 group">
            {company.logoUrl ? (
              <div className="relative">
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-xl blur-xl group-hover:bg-primary/30 transition-colors" />
                <div className="relative bg-gradient-to-br from-background to-muted p-2 rounded-xl border border-border/50 group-hover:border-primary/50 transition-all">
                  <Image 
                    src={company.logoUrl} 
                    alt={company.name} 
                    width={40} 
                    height={40}
                    className="object-contain"
                  />
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-primary-foreground" />
              </div>
            )}
            <div>
              <span className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent group-hover:from-primary group-hover:to-primary/70 transition-all">
                {company.name}
              </span>
              {company.description && (
                <p className="text-xs text-muted-foreground max-w-[200px] truncate">
                  {company.description}
                </p>
              )}
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 rounded-xl font-medium transition-all duration-300 ${
                  isActive(link.href)
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {/* Active Indicator */}
                {isActive(link.href) && (
                  <span className="absolute inset-0 bg-primary/10 rounded-xl border border-primary/20" />
                )}
                <span className="relative z-10">{link.label}</span>
                
                {/* Hover Effect */}
                <span className="absolute inset-0 bg-primary/5 rounded-xl scale-0 group-hover:scale-100 transition-transform" />
              </Link>
            ))}
            
            {/* CTA Button */}
            {company.contactPhone && (
              <Link
                href={`/${companySlug}/contact`}
                className="ml-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
              >
                Get in Touch
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border/50 animate-in slide-in-from-top">
            <div className="flex flex-col gap-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`px-4 py-3 rounded-xl font-medium transition-all ${
                    isActive(link.href)
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {company.contactPhone && (
                <Link
                  href={`/${companySlug}/contact`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="mt-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-3 rounded-xl font-semibold text-center"
                >
                  Get in Touch
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
```

---

## 📄 Pages

### 6. Company Layout (`src/app/[company]/layout.tsx`)

```typescript
import { notFound } from 'next/navigation';
import { api } from '@/lib/api/client';
import { Navigation } from '@/components/layout/Navigation';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { company: string };
}) {
  try {
    const company = await api.getCompany(params.company);

    return (
      <div className="min-h-screen">
        <Navigation company={company} companySlug={params.company} />
        {children}
        
        {/* Footer */}
        <footer className="border-t mt-20 py-8">
          <div className="container mx-auto px-4 text-center text-muted-foreground">
            <p>© 2025 {company.name}. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  } catch {
    notFound();
  }
}
```

### 7. Company Homepage (`src/app/[company]/page.tsx`)

```typescript
import { api } from '@/lib/api/client';
import { ProductCard } from '@/components/catalog/ProductCard';
import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Sparkles, TrendingUp, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default async function CompanyHomePage({
  params,
}: {
  params: { company: string };
}) {
  const company = await api.getCompany(params.company);
  const { data: featuredProducts } = await api.getProducts(params.company, 1, 8, { isFeatured: true });

  return (
    <div>
      {/* Hero Section - Premium Design */}
      <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Background with Parallax Effect */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ 
            backgroundImage: company.bannerUrl ? `url(${company.bannerUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
        >
          {/* Overlay with Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/50 to-black/70" />
          
          {/* Animated Grid Pattern */}
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />
        </div>

        {/* Content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-4 py-2 text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              <span>Premium Quality Products</span>
            </div>

            {/* Title with Gradient */}
            <h1 className="text-6xl md:text-7xl font-bold leading-tight">
              <span className="bg-gradient-to-r from-white via-white to-white/80 bg-clip-text text-transparent animate-pulse">
                {company.name}
              </span>
            </h1>

            {/* Description */}
            {company.description && (
              <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto leading-relaxed">
                {company.description}
              </p>
            )}

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              {company.contactPhone && (
                <WhatsAppButton 
                  phone={company.contactPhone} 
                  message={`Hi ${company.name}! I'd like to know more about your products.`}
                />
              )}
              <Link
                href={`/${params.company}/products`}
                className="group inline-flex items-center gap-2 bg-white/10 backdrop-blur-md hover:bg-white/20 border border-white/30 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-105"
              >
                <span>Browse Catalog</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-12 max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                <div className="text-3xl font-bold">{featuredProducts.length}+</div>
                <div className="text-sm text-white/70">Products</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                <div className="text-3xl font-bold">100%</div>
                <div className="text-sm text-white/70">Authentic</div>
              </div>
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4">
                <div className="text-3xl font-bold">24/7</div>
                <div className="text-sm text-white/70">Support</div>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Secure Shopping</h3>
              <p className="text-muted-foreground">Your satisfaction is our priority</p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Fast Response</h3>
              <p className="text-muted-foreground">Quick replies on WhatsApp</p>
            </div>
            <div className="text-center space-y-3">
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-2xl flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold">Best Prices</h3>
              <p className="text-muted-foreground">Competitive pricing guaranteed</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" />
            <span>Handpicked For You</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4">Featured Products</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover our carefully curated selection of premium products
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {featuredProducts.map(product => (
            <ProductCard key={product.id} product={product} companySlug={params.company} />
          ))}
        </div>

        {/* View All Button */}
        <div className="text-center mt-12">
          <Link
            href={`/${params.company}/products`}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-2xl font-semibold hover:shadow-lg hover:shadow-primary/50 hover:scale-105 transition-all duration-300"
          >
            <span>View All Products</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
```

### 8. Product Catalog (`src/app/[company]/products/page.tsx`)

```typescript
import { api } from '@/lib/api/client';
import { ProductCard } from '@/components/catalog/ProductCard';

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: { company: string };
  searchParams: { page?: string; search?: string };
}) {
  const page = parseInt(searchParams.page || '1');
  const search = searchParams.search;

  const { data: products, pagination } = await api.getProducts(
    params.company,
    page,
    20,
    { search }
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">All Products</h1>

      {/* Products Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {products.map(product => (
          <ProductCard key={product.id} product={product} companySlug={params.company} />
        ))}
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
            <a
              key={p}
              href={`?page=${p}${search ? `&search=${search}` : ''}`}
              className={`px-4 py-2 rounded ${
                p === page ? 'bg-primary text-primary-foreground' : 'bg-muted'
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 9. Product Detail (`src/app/[company]/products/[slug]/page.tsx`)

```typescript
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { api } from '@/lib/api/client';
import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { YouTubeEmbed } from '@/components/product/YouTubeEmbed';
import { ProductCard } from '@/components/catalog/ProductCard';

export default async function ProductDetailPage({
  params,
}: {
  params: { company: string; slug: string };
}) {
  try {
    const product = await api.getProduct(params.slug, params.company);
    const company = await api.getCompany(params.company);

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-square relative bg-muted rounded-lg overflow-hidden">
              {product.imageUrls[0] && (
                <Image src={product.imageUrls[0]} alt={product.name} fill className="object-cover" />
              )}
            </div>
            {product.imageUrls.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {product.imageUrls.slice(1).map((url, i) => (
                  <div key={i} className="aspect-square relative bg-muted rounded overflow-hidden">
                    <Image src={url} alt={`${product.name} ${i + 2}`} fill className="object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">{product.name}</h1>
              {product.shortDescription && (
                <p className="text-lg text-muted-foreground">{product.shortDescription}</p>
              )}
            </div>

            <div className="text-3xl font-bold">
              SRD {product.sellingPriceSRD.toFixed(2)}
            </div>

            <div>
              <span className={`px-3 py-1 rounded ${
                product.quantityInStock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {product.quantityInStock > 0 ? `In Stock (${product.quantityInStock})` : 'Out of Stock'}
              </span>
            </div>

            {company.contactPhone && (
              <WhatsAppButton
                phone={company.contactPhone}
                message={`Hi! I'm interested in: ${product.name}`}
                className="w-full"
              />
            )}

            {product.description && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Description</h2>
                <p className="text-muted-foreground whitespace-pre-line">{product.description}</p>
              </div>
            )}

            {product.specifications && Object.keys(product.specifications).length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-2">Specifications</h2>
                <dl className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="border-b pb-2">
                      <dt className="font-medium">{key}</dt>
                      <dd className="text-muted-foreground">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </div>

        {/* YouTube Reviews */}
        {product.youtubeReviewUrls && product.youtubeReviewUrls.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-4">Product Reviews</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {product.youtubeReviewUrls.map((url, i) => (
                <YouTubeEmbed key={i} url={url} />
              ))}
            </div>
          </section>
        )}

        {/* Related Products */}
        {product.relatedProducts && product.relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-4">Related Products</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {product.relatedProducts.map(related => (
                <ProductCard key={related.id} product={related} companySlug={params.company} />
              ))}
            </div>
          </section>
        )}
      </div>
    );
  } catch {
    notFound();
  }
}
```

### 10. Contact Page (`src/app/[company]/contact/page.tsx`)

```typescript
import { api } from '@/lib/api/client';
import { WhatsAppButton } from '@/components/contact/WhatsAppButton';
import { Mail, Phone, Instagram, Facebook } from 'lucide-react';

export default async function ContactPage({ params }: { params: { company: string } }) {
  const company = await api.getCompany(params.company);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-4xl font-bold mb-8">Contact Us</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-6">
              Have questions about our products? We'd love to hear from you!
            </p>
          </div>

          {company.contactPhone && (
            <div>
              <WhatsAppButton
                phone={company.contactPhone}
                message={`Hi ${company.name}! I have a question.`}
                className="w-full justify-center"
              />
            </div>
          )}

          <div className="space-y-4">
            {company.contactEmail && (
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5" />
                <a href={`mailto:${company.contactEmail}`} className="hover:text-primary">
                  {company.contactEmail}
                </a>
              </div>
            )}

            {company.contactPhone && (
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5" />
                <span>{company.contactPhone}</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold">Follow Us</h2>
          <div className="space-y-4">
            {company.socialMedia?.instagram && (
              <a
                href={`https://instagram.com/${company.socialMedia.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-primary transition-colors"
              >
                <Instagram className="w-5 h-5" />
                <span>{company.socialMedia.instagram}</span>
              </a>
            )}

            {company.socialMedia?.facebook && (
              <a
                href={company.socialMedia.facebook}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 hover:text-primary transition-colors"
              >
                <Facebook className="w-5 h-5" />
                <span>Facebook</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 Premium UI Styling

### Update `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'pulse-slow': 'pulse-slow 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}

export default config
```

### Update `src/app/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 240 10% 3.9%;
    --card: 0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --primary: 221 83% 53%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;
    --muted: 240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;
    --accent: 240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;
    --border: 240 5.9% 90%;
    --input: 240 5.9% 90%;
    --ring: 221 83% 53%;
    --radius: 0.75rem;
  }

  .dark {
    --background: 240 10% 3.9%;
    --foreground: 0 0% 98%;
    --card: 240 10% 5%;
    --card-foreground: 0 0% 98%;
    --primary: 221 83% 53%;
    --primary-foreground: 0 0% 98%;
    --secondary: 240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted: 240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent: 240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --border: 240 3.7% 15.9%;
    --input: 240 3.7% 15.9%;
    --ring: 221 83% 53%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }

  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }

  /* Custom scrollbar */
  ::-webkit-scrollbar {
    width: 10px;
    height: 10px;
  }

  ::-webkit-scrollbar-track {
    @apply bg-muted;
  }

  ::-webkit-scrollbar-thumb {
    @apply bg-muted-foreground/30 rounded-lg;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-muted-foreground/50;
  }
}

@layer utilities {
  .animate-in {
    animation: fade-in 0.5s ease-out;
  }

  .slide-in-from-top {
    animation: slide-in-from-top 0.3s ease-out;
  }

  /* Glass morphism effect */
  .glass {
    @apply bg-background/80 backdrop-blur-xl border border-border/50;
  }

  /* Gradient text */
  .gradient-text {
    @apply bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent;
  }
}
```

---

## 🚀 Run & Deploy

### Development:
```bash
npm run dev
# Visit: http://localhost:3001/nextx
```

### Deploy to Vercel:
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_DASHBOARD_API_URL=https://your-dashboard.vercel.app
# - NEXT_PUBLIC_SITE_URL=https://your-ecommerce.vercel.app
```

---

## ✅ You're Done!

Your e-commerce platform is complete with:
- ✅ Company storefronts (`/nextx`)
- ✅ Product catalog with filters
- ✅ Product detail pages with galleries
- ✅ YouTube video embeds
- ✅ WhatsApp integration
- ✅ Social media links
- ✅ Mobile responsive
- ✅ SEO ready

**Time to build**: ~2-3 hours following this guide!

Add new companies in the dashboard → They appear automatically at `/company-slug` 🎉
