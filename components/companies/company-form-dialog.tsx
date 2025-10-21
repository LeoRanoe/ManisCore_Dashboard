"use client"

import { useState, useCallback, memo, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { CompanyFormSchema, type CompanyFormData } from "@/lib/validations"

interface Company {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  logoUrl?: string | null
  bannerUrl?: string | null
  contactEmail?: string | null
  contactPhone?: string | null
  socialMedia?: any
  themeConfig?: any
  isPublic?: boolean
  createdAt: string
  updatedAt: string
}

interface CompanyFormDialogProps {
  isOpen: boolean
  onClose: () => void
  company?: Company
  onSuccess: () => void
}

const CompanyFormDialogComponent = ({
  isOpen,
  onClose,
  company,
  onSuccess,
}: CompanyFormDialogProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(CompanyFormSchema),
    defaultValues: {
      isPublic: true,
      socialMedia: { instagram: "", facebook: "", tiktok: "" },
      themeConfig: { primaryColor: "", secondaryColor: "", accentColor: "" },
    },
  })

  // Reset form with company data when dialog opens or company changes
  useEffect(() => {
    if (isOpen && company) {
      reset({
        name: company.name,
        slug: company.slug || "",
        description: company.description || "",
        logoUrl: company.logoUrl || "",
        bannerUrl: company.bannerUrl || "",
        contactEmail: company.contactEmail || "",
        contactPhone: company.contactPhone || "",
        socialMedia: company.socialMedia || { instagram: "", facebook: "", tiktok: "" },
        themeConfig: company.themeConfig || { primaryColor: "", secondaryColor: "", accentColor: "" },
        isPublic: company.isPublic ?? true,
      })
    } else if (isOpen && !company) {
      // Reset to empty form for new company
      reset({
        name: "",
        slug: "",
        description: "",
        logoUrl: "",
        bannerUrl: "",
        contactEmail: "",
        contactPhone: "",
        isPublic: true,
        socialMedia: { instagram: "", facebook: "", tiktok: "" },
        themeConfig: { primaryColor: "", secondaryColor: "", accentColor: "" },
      })
    }
  }, [isOpen, company, reset])

  const handleFormSubmit = async (data: CompanyFormData) => {
    setIsLoading(true)
    try {
      const url = company ? `/api/companies/${company.id}` : "/api/companies"
      const method = company ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to save company")
      }

      toast({
        title: "Success",
        description: `Company ${company ? "updated" : "created"} successfully`,
      })

      reset()
      onSuccess()
      onClose()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{company ? "Edit Company" : "Add New Company"}</DialogTitle>
          <DialogDescription>
            {company ? "Update company information and e-commerce settings" : "Add a new company to the system"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="space-y-2">
            <Label htmlFor="name">Company Name *</Label>
            <Input
              id="name"
              {...register("name")}
              placeholder="Enter company name"
              className="w-full"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Company Slug (URL)</Label>
            <Input
              id="slug"
              {...register("slug")}
              placeholder="nextx"
            />
            <p className="text-xs text-muted-foreground">
              Used in URLs: /nextx
            </p>
            {errors.slug && (
              <p className="text-sm text-red-500">{errors.slug.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register("description")}
              rows={3}
              placeholder="Company description for e-commerce"
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              {...register("logoUrl")}
              placeholder="https://..."
            />
            {errors.logoUrl && (
              <p className="text-sm text-red-500">{errors.logoUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bannerUrl">Banner URL</Label>
            <Input
              id="bannerUrl"
              {...register("bannerUrl")}
              placeholder="https://..."
            />
            {errors.bannerUrl && (
              <p className="text-sm text-red-500">{errors.bannerUrl.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactEmail">Contact Email</Label>
            <Input
              id="contactEmail"
              {...register("contactEmail")}
              type="email"
              placeholder="info@company.com"
            />
            {errors.contactEmail && (
              <p className="text-sm text-red-500">{errors.contactEmail.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactPhone">WhatsApp Number</Label>
            <Input
              id="contactPhone"
              {...register("contactPhone")}
              placeholder="5978888888"
            />
            {errors.contactPhone && (
              <p className="text-sm text-red-500">{errors.contactPhone.message}</p>
            )}
          </div>

          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-medium mb-3">Social Media</h3>
            
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram Username</Label>
              <Input
                id="instagram"
                {...register("socialMedia.instagram")}
                placeholder="@nextx.sr"
              />
            </div>

            <div className="space-y-2 mt-2">
              <Label htmlFor="facebook">Facebook URL</Label>
              <Input
                id="facebook"
                {...register("socialMedia.facebook")}
                placeholder="https://facebook.com/..."
              />
            </div>

            <div className="space-y-2 mt-2">
              <Label htmlFor="tiktok">TikTok Username</Label>
              <Input
                id="tiktok"
                {...register("socialMedia.tiktok")}
                placeholder="@nextx.sr"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 pt-4">
            <input
              type="checkbox"
              id="isPublic"
              {...register("isPublic")}
              className="h-4 w-4"
            />
            <Label htmlFor="isPublic">Show in E-Commerce</Label>
          </div>

          <DialogFooter className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="min-w-[100px]"
            >
              {isLoading ? "Saving..." : company ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
// Export memoized version for better performance
export const CompanyFormDialog = memo(CompanyFormDialogComponent, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.company?.id === nextProps.company?.id
  )
})
