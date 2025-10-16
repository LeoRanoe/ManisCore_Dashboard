"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, Store, Clock, MessageCircle, Image as ImageIcon, FileText, Search } from "lucide-react"
import Link from "next/link"

interface Company {
  id: string
  name: string
  slug: string
  businessHours?: string | null
  whatsappNumber?: string | null
  whatsappGreeting?: string | null
  heroTitle?: string | null
  heroSubtitle?: string | null
  aboutUs?: string | null
  shippingPolicy?: string | null
  returnsPolicy?: string | null
  warrantyInfo?: string | null
  termsConditions?: string | null
  privacyPolicy?: string | null
  metaTitle?: string | null
  metaDescription?: string | null
  metaKeywords?: string | null
}

export default function CompanyEcommercePage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const companyId = params.id as string

  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'business' | 'whatsapp' | 'hero' | 'about' | 'policies' | 'seo'>('business')

  const [formData, setFormData] = useState({
    businessHours: '',
    whatsappNumber: '',
    whatsappGreeting: '',
    heroTitle: '',
    heroSubtitle: '',
    aboutUs: '',
    shippingPolicy: '',
    returnsPolicy: '',
    warrantyInfo: '',
    termsConditions: '',
    privacyPolicy: '',
    metaTitle: '',
    metaDescription: '',
    metaKeywords: '',
  })

  useEffect(() => {
    fetchCompany()
  }, [companyId])

  const fetchCompany = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/companies/${companyId}`)
      if (!response.ok) {
        throw new Error("Failed to fetch company")
      }
      const data = await response.json()
      setCompany(data)
      
      // Populate form with existing data
      setFormData({
        businessHours: data.businessHours || '',
        whatsappNumber: data.whatsappNumber || '',
        whatsappGreeting: data.whatsappGreeting || '',
        heroTitle: data.heroTitle || '',
        heroSubtitle: data.heroSubtitle || '',
        aboutUs: data.aboutUs || '',
        shippingPolicy: data.shippingPolicy || '',
        returnsPolicy: data.returnsPolicy || '',
        warrantyInfo: data.warrantyInfo || '',
        termsConditions: data.termsConditions || '',
        privacyPolicy: data.privacyPolicy || '',
        metaTitle: data.metaTitle || '',
        metaDescription: data.metaDescription || '',
        metaKeywords: data.metaKeywords || '',
      })
    } catch (error) {
      console.error("Error fetching company:", error)
      toast({
        title: "Error",
        description: "Failed to load company details",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch(`/api/companies/${companyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to update company")
      }

      toast({
        title: "Success",
        description: "E-commerce settings updated successfully",
      })

      fetchCompany()
    } catch (error) {
      console.error("Error updating company:", error)
      toast({
        title: "Error",
        description: "Failed to update e-commerce settings",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const tabs = [
    { id: 'business', label: 'Business Hours', icon: Clock },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
    { id: 'hero', label: 'Hero Section', icon: ImageIcon },
    { id: 'about', label: 'About Us', icon: Store },
    { id: 'policies', label: 'Policies', icon: FileText },
    { id: 'seo', label: 'SEO', icon: Search },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/companies">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-3xl font-bold tracking-tight">E-commerce Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">
              {loading ? "Loading..." : `Configure e-commerce settings for ${company?.name}`}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b pb-4">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  type="button"
                  variant={activeTab === tab.id ? "default" : "outline"}
                  onClick={() => setActiveTab(tab.id as any)}
                  className="flex items-center gap-2"
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Business Hours Tab */}
            {activeTab === 'business' && (
              <Card>
                <CardHeader>
                  <CardTitle>Business Hours</CardTitle>
                  <CardDescription>
                    Set your business operating hours. This will be displayed on your e-commerce site.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessHours">Business Hours</Label>
                    <Textarea
                      id="businessHours"
                      placeholder="Mon-Fri: 9:00 AM - 6:00 PM&#10;Sat: 10:00 AM - 4:00 PM&#10;Sun: Closed"
                      value={formData.businessHours}
                      onChange={(e) => handleInputChange('businessHours', e.target.value)}
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-sm text-muted-foreground">
                      Enter your business hours. Use line breaks for multiple days.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* WhatsApp Tab */}
            {activeTab === 'whatsapp' && (
              <Card>
                <CardHeader>
                  <CardTitle>WhatsApp Business Integration</CardTitle>
                  <CardDescription>
                    Configure WhatsApp contact button and automated greeting message.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="whatsappNumber">WhatsApp Number</Label>
                    <Input
                      id="whatsappNumber"
                      placeholder="+1234567890"
                      value={formData.whatsappNumber}
                      onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Include country code (e.g., +1 for US, +44 for UK)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsappGreeting">Greeting Message</Label>
                    <Textarea
                      id="whatsappGreeting"
                      placeholder="Hi! I'm interested in your products..."
                      value={formData.whatsappGreeting}
                      onChange={(e) => handleInputChange('whatsappGreeting', e.target.value)}
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      This message will be pre-filled when customers click the WhatsApp button
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Hero Section Tab */}
            {activeTab === 'hero' && (
              <Card>
                <CardHeader>
                  <CardTitle>Hero Section</CardTitle>
                  <CardDescription>
                    Customize the main banner on your homepage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="heroTitle">Hero Title</Label>
                    <Input
                      id="heroTitle"
                      placeholder="Welcome to Our Store"
                      value={formData.heroTitle}
                      onChange={(e) => handleInputChange('heroTitle', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="heroSubtitle">Hero Subtitle</Label>
                    <Textarea
                      id="heroSubtitle"
                      placeholder="Discover our amazing collection of products..."
                      value={formData.heroSubtitle}
                      onChange={(e) => handleInputChange('heroSubtitle', e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* About Us Tab */}
            {activeTab === 'about' && (
              <Card>
                <CardHeader>
                  <CardTitle>About Us</CardTitle>
                  <CardDescription>
                    Tell your customers about your company and values.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="aboutUs">About Us Content</Label>
                    <Textarea
                      id="aboutUs"
                      placeholder="Tell your story..."
                      value={formData.aboutUs}
                      onChange={(e) => handleInputChange('aboutUs', e.target.value)}
                      rows={10}
                    />
                    <p className="text-sm text-muted-foreground">
                      This will be displayed on the About Us section of your website
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Policies Tab */}
            {activeTab === 'policies' && (
              <Card>
                <CardHeader>
                  <CardTitle>Store Policies</CardTitle>
                  <CardDescription>
                    Define your shipping, returns, warranty, terms, and privacy policies.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="shippingPolicy">Shipping Policy</Label>
                    <Textarea
                      id="shippingPolicy"
                      placeholder="Describe your shipping terms..."
                      value={formData.shippingPolicy}
                      onChange={(e) => handleInputChange('shippingPolicy', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="returnsPolicy">Returns Policy</Label>
                    <Textarea
                      id="returnsPolicy"
                      placeholder="Explain your return and refund policy..."
                      value={formData.returnsPolicy}
                      onChange={(e) => handleInputChange('returnsPolicy', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="warrantyInfo">Warranty Information</Label>
                    <Textarea
                      id="warrantyInfo"
                      placeholder="Detail your warranty coverage..."
                      value={formData.warrantyInfo}
                      onChange={(e) => handleInputChange('warrantyInfo', e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="termsConditions">Terms & Conditions</Label>
                    <Textarea
                      id="termsConditions"
                      placeholder="Your terms and conditions..."
                      value={formData.termsConditions}
                      onChange={(e) => handleInputChange('termsConditions', e.target.value)}
                      rows={6}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="privacyPolicy">Privacy Policy</Label>
                    <Textarea
                      id="privacyPolicy"
                      placeholder="Your privacy policy..."
                      value={formData.privacyPolicy}
                      onChange={(e) => handleInputChange('privacyPolicy', e.target.value)}
                      rows={6}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* SEO Tab */}
            {activeTab === 'seo' && (
              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                  <CardDescription>
                    Optimize your store for search engines.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="metaTitle">Meta Title</Label>
                    <Input
                      id="metaTitle"
                      placeholder="Your Store Name - Best Products Online"
                      value={formData.metaTitle}
                      onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                      maxLength={60}
                    />
                    <p className="text-sm text-muted-foreground">
                      Recommended: 50-60 characters. Currently: {formData.metaTitle.length}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metaDescription">Meta Description</Label>
                    <Textarea
                      id="metaDescription"
                      placeholder="Shop the best products at competitive prices..."
                      value={formData.metaDescription}
                      onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                      rows={3}
                      maxLength={160}
                    />
                    <p className="text-sm text-muted-foreground">
                      Recommended: 150-160 characters. Currently: {formData.metaDescription.length}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="metaKeywords">Meta Keywords</Label>
                    <Input
                      id="metaKeywords"
                      placeholder="products, online store, best deals"
                      value={formData.metaKeywords}
                      onChange={(e) => handleInputChange('metaKeywords', e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Comma-separated keywords for SEO
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Save Button */}
            <div className="flex justify-end gap-4 mt-6">
              <Link href="/companies">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  )
}
