"use client"

import { useState } from "react"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface MultiImageUploadProps {
  value?: string[]
  onChange: (urls: string[]) => void
  label?: string
  disabled?: boolean
  maxImages?: number
}

export function MultiImageUpload({ 
  value = [], 
  onChange, 
  label = "Product Images", 
  disabled,
  maxImages = 5 
}: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    // Check if adding these files would exceed the limit
    if (value.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can only upload up to ${maxImages} images per product`,
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const newUrls: string[] = []

    try {
      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast({
            title: "Invalid file type",
            description: `${file.name} is not an image file`,
            variant: "destructive",
          })
          continue
        }

        // Validate file size (4.5MB max)
        if (file.size > 4.5 * 1024 * 1024) {
          toast({
            title: "File too large",
            description: `${file.name} must be less than 4.5MB`,
            variant: "destructive",
          })
          continue
        }

        // Upload to Vercel Blob
        const formData = new FormData()
        formData.append('file', file)

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`)
        }

        const data = await response.json()
        newUrls.push(data.url)
      }

      if (newUrls.length > 0) {
        onChange([...value, ...newUrls])
        toast({
          title: "Success",
          description: `${newUrls.length} image${newUrls.length > 1 ? 's' : ''} uploaded successfully`,
        })
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload some images. Please try again.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
      // Reset the input
      e.target.value = ''
    }
  }

  const handleRemove = async (urlToRemove: string) => {
    try {
      // Delete from Vercel Blob
      await fetch(`/api/upload?url=${encodeURIComponent(urlToRemove)}`, {
        method: 'DELETE',
      })

      onChange(value.filter(url => url !== urlToRemove))

      toast({
        title: "Success",
        description: "Image removed successfully",
      })
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: "Delete failed",
        description: "Failed to remove image",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-sm text-muted-foreground">
          {value.length} / {maxImages} images
        </span>
      </div>
      
      {value.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {value.map((url, index) => (
            <div key={url} className="relative group">
              <img
                src={url}
                alt={`Product image ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemove(url)}
                disabled={disabled || uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          
          {value.length < maxImages && (
            <label className="h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
                disabled={disabled || uploading}
              />
              <Upload className="h-8 w-8" />
              <span className="text-xs">Add more</span>
            </label>
          )}
        </div>
      ) : (
        <label className="w-full h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground cursor-pointer hover:border-primary hover:text-primary transition-colors">
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          <ImageIcon className="h-12 w-12" />
          <p className="text-sm">No images uploaded</p>
          <p className="text-xs">Click or drag to upload (max {maxImages})</p>
        </label>
      )}
      
      {uploading && (
        <p className="text-sm text-muted-foreground">Uploading images...</p>
      )}
    </div>
  )
}
