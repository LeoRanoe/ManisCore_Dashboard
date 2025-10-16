"use client"

import { useState, useRef } from "react"
import { Upload, X, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"

interface ImageUploadProps {
  value?: string
  onChange: (url: string | undefined) => void
  label?: string
  disabled?: boolean
}

export function ImageUpload({ value, onChange, label = "Product Image", disabled }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(value)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file",
        variant: "destructive",
      })
      return
    }

    // Validate file size (4.5MB max)
    if (file.size > 4.5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Image must be less than 4.5MB",
        variant: "destructive",
      })
      return
    }

    try {
      setUploading(true)

      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string)
      }
      reader.readAsDataURL(file)

      // Upload to Vercel Blob
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to upload image')
      }

      const data = await response.json()
      onChange(data.url)

      toast({
        title: "Success",
        description: "Image uploaded successfully",
      })
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive",
      })
      setPreviewUrl(value)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = async () => {
    if (!value) return

    try {
      // Delete from Vercel Blob
      await fetch(`/api/upload?url=${encodeURIComponent(value)}`, {
        method: 'DELETE',
      })

      setPreviewUrl(undefined)
      onChange(undefined)

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
      <Label>{label}</Label>
      <div className="flex flex-col gap-4">
        {previewUrl ? (
          <div className="relative w-full max-w-sm">
            <img
              src={previewUrl}
              alt="Product preview"
              className="w-full h-48 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="sm"
              className="absolute top-2 right-2"
              onClick={handleRemove}
              disabled={disabled || uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="w-full max-w-sm h-48 border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon className="h-12 w-12" />
            <p className="text-sm">No image uploaded</p>
          </div>
        )}
        
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled || uploading}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || uploading}
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Uploading..." : previewUrl ? "Change Image" : "Upload Image"}
          </Button>
        </div>
      </div>
    </div>
  )
}
