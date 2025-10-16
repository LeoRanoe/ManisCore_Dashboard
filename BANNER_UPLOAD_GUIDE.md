# Banner Image Upload - Vercel Blob Integration

## Date: October 16, 2025

## Change Summary

Updated the Banners management page to use **Vercel Blob storage** for image uploads instead of requiring manual URL input.

---

## What Changed

### Before
- Users had to provide an image URL manually
- Required images to be hosted externally
- Two separate fields: "Image URL" and "Link URL" (confusing)

### After
- Users can now upload images directly from their computer
- Images are automatically uploaded to Vercel Blob storage
- Clear distinction: "Banner Image" (upload) and "Link URL" (where banner links to)
- Automatic image preview during upload
- File validation (type and size)

---

## Features

### ✅ Direct File Upload
- Click "Choose file" or drag-and-drop
- Supported formats: All image types (JPG, PNG, WebP, GIF, etc.)
- Maximum file size: 4.5MB
- Automatic compression and optimization by Vercel

### ✅ Image Preview
- Real-time preview while uploading
- Shows current banner image when editing
- Easy to remove and re-upload

### ✅ Recommended Sizes
- **Hero Banner**: 1920x600px (wide landscape)
- **Sidebar Banner**: 400x600px (vertical)
- **Footer Banner**: 1200x200px (wide)
- **Popup Banner**: 800x600px (standard)

### ✅ Automatic Validation
- Checks file type (must be an image)
- Validates file size (< 4.5MB)
- Ensures image is uploaded before saving

---

## How to Use

### Adding a New Banner

1. Click **"Add Banner"** button
2. Fill in the banner details:
   - **Title**: Banner name (e.g., "Summer Sale 2025")
   - **Description**: Optional description
   - **Banner Image**: Click "Choose file" to upload
   - **Link URL**: Optional - where should the banner link to?
   - **Position**: Choose where banner appears (Hero, Sidebar, etc.)
   - **Start/End Date**: Optional scheduling
   - **Display Order**: Number (lower = shows first)
   - **Active**: Check to display on website

3. Click **"Create"**

### Editing an Existing Banner

1. Click the **pencil icon** on any banner
2. The form will show current details with image preview
3. To change image:
   - Click "Remove" on current image
   - Upload a new image
4. Click **"Update"**

---

## Technical Details

### File Modified
- `src/app/banners/page.tsx`

### Changes Made

1. **Added ImageUpload Component Import**
```typescript
import { ImageUpload } from "@/components/ui/image-upload"
```

2. **Replaced Image URL Input**
```typescript
// Before
<Input
  id="imageUrl"
  type="url"
  placeholder="https://..."
  value={formData.imageUrl}
  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
  required
/>

// After
<ImageUpload
  label="Banner Image *"
  value={formData.imageUrl}
  onChange={(url) => setFormData({ ...formData, imageUrl: url || "" })}
  disabled={saving}
/>
```

3. **Added Validation**
```typescript
// Validate image URL before submission
if (!formData.imageUrl || formData.imageUrl.trim() === "") {
  toast({
    title: "Validation Error",
    description: "Please upload a banner image",
    variant: "destructive",
  })
  return
}
```

4. **Added Helper Text**
- Recommended image sizes
- Clear explanation for Link URL field

---

## API Endpoints Used

### Upload Image
- **Endpoint**: `POST /api/upload`
- **Purpose**: Upload image to Vercel Blob
- **Max Size**: 4.5MB
- **Returns**: `{ url: string, downloadUrl: string }`

### Delete Image
- **Endpoint**: `DELETE /api/upload?url={imageUrl}`
- **Purpose**: Remove image from Vercel Blob
- **Used When**: User removes/replaces banner image

---

## Benefits

### For Users
- ✅ Faster workflow - no need to host images separately
- ✅ No technical knowledge required
- ✅ Drag-and-drop support
- ✅ Instant preview
- ✅ Better UX with clear instructions

### For System
- ✅ Centralized image storage
- ✅ Automatic CDN distribution via Vercel
- ✅ No broken image links
- ✅ Automatic HTTPS
- ✅ Optimized delivery worldwide

---

## Environment Variables Required

Make sure these are set in your `.env` file:

```env
# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_xxxxx
```

You can get this token from:
1. Vercel Dashboard → Your Project → Storage
2. Create a new Blob Store (if not exists)
3. Copy the Read-Write Token

---

## File Size Limits

| Type | Limit | Reason |
|------|-------|--------|
| Single File | 4.5 MB | Vercel Blob limit |
| Total Storage | Depends on plan | Check Vercel dashboard |

### Optimization Tips
- Use JPG for photos (smaller size)
- Use PNG for graphics with transparency
- Use WebP for best compression (modern browsers)
- Compress images before upload (tools: TinyPNG, Squoosh)

---

## Troubleshooting

### "Failed to upload image"
- **Check**: File size < 4.5MB
- **Check**: File is an image type
- **Check**: Internet connection
- **Check**: BLOB_READ_WRITE_TOKEN is set

### "No preview showing"
- **Wait**: Upload may take a few seconds
- **Check**: Browser console for errors
- **Try**: Refresh page and upload again

### "Image not displaying on website"
- **Check**: Banner is marked as "Active"
- **Check**: Current date is within Start/End date range
- **Check**: Banner position matches your layout

---

## Next Steps

Consider adding these enhancements:

1. **Image Cropping Tool**
   - Allow users to crop images to recommended sizes
   - Use library like `react-image-crop`

2. **Bulk Upload**
   - Upload multiple banners at once
   - Drag-and-drop multiple files

3. **Image Optimization**
   - Automatic resizing to recommended dimensions
   - Format conversion (e.g., auto-convert to WebP)

4. **Preview Templates**
   - Show how banner looks in different positions
   - Mobile/desktop preview

5. **Analytics**
   - Track banner clicks
   - A/B testing different banners

---

## Testing Checklist

- [ ] Upload a new banner image (< 4.5MB)
- [ ] Verify image appears in preview
- [ ] Save banner and check it displays in table
- [ ] Edit banner and change image
- [ ] Remove banner image and re-upload
- [ ] Try uploading non-image file (should show error)
- [ ] Try uploading file > 4.5MB (should show error)
- [ ] Delete banner (image should be removed from Blob)

---

## Support

If you encounter issues:
1. Check browser console (F12) for errors
2. Verify Vercel Blob storage is configured
3. Check environment variables are set correctly
4. Ensure you're using a supported image format
