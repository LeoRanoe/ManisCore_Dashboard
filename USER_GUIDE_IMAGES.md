# Image Feature - User Guide

## How to Use the Multiple Images Feature

### 📸 Uploading Images

#### When Creating a New Item
1. Click **"Add Item"** button on inventory page
2. Fill in item details (name, company, etc.)
3. Scroll to **"Product Images"** section
4. Click **"Browse files"** or drag & drop images
5. Upload up to **5 images** per item
6. Each image max size: **4.5MB**
7. Click **"Create"** to save

#### When Editing an Existing Item
1. Click the **Edit** button (pencil icon) on any item
2. The form opens with **existing images displayed** in the gallery
3. You can:
   - **Add more images** (up to 5 total)
   - **Delete individual images** (click the X button)
   - **Keep existing images** (no action needed)
4. Click **"Save Changes"**

### 👀 Viewing Images

#### In the Inventory Table
- **Image column** shows a small thumbnail (48x48px)
- **Single image**: Just the thumbnail
- **Multiple images**: Thumbnail with a **"+N" badge** (e.g., "+3" means 4 total images)
- **Hover over thumbnail**: See all images in a preview popup!

#### Hover Preview Features
- Grid layout shows all images
- Each preview image is 80x80px
- Stays visible while hovering
- Disappears when mouse moves away
- Great for quick product identification!

### 🗑️ Deleting Images

#### From Edit Form
1. Open item in edit mode
2. Find the image you want to delete
3. Click the **X button** in the top-right corner of that image
4. Image is immediately removed from the gallery
5. Click **"Save Changes"** to persist the deletion

**Note**: Deleted images are permanently removed from Vercel Blob storage - this action cannot be undone!

### ✅ What Should You See?

#### Successful Upload
- ✅ Progress bar during upload
- ✅ Image appears in gallery grid
- ✅ Success toast notification
- ✅ Image count updates (e.g., "3/5 images")

#### In Inventory Table After Saving
- ✅ Thumbnail visible in Image column
- ✅ Badge shows "+N" for multiple images
- ✅ Hover reveals all images in preview

#### In Edit Form
- ✅ All previously uploaded images display
- ✅ Can add more images
- ✅ Can delete individual images
- ✅ Changes are editable and deletable

### ❌ Troubleshooting

#### "Images not showing in edit form"
- **Fixed!** The TypeScript interfaces have been updated
- Refresh your browser and try again
- Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

#### "Images not appearing in table"
- **Fixed!** The gallery column is now displayed
- Make sure you've saved the item after uploading images
- Check that the deployment is the latest version

#### "Upload failed"
- Check file size (max 4.5MB per image)
- Verify file type (JPEG, PNG, WebP, GIF)
- Check internet connection
- Verify BLOB_READ_WRITE_TOKEN is set in Vercel

#### "Can't delete image"
- Make sure you click "Save Changes" after clicking X
- Check browser console for errors
- Refresh the page and try again

### 🎨 Image Best Practices

#### Recommended Image Specs
- **Format**: JPEG or PNG preferred
- **Size**: 500x500px to 1000x1000px (square)
- **File Size**: Under 500KB for fast loading
- **Quality**: Medium to high quality
- **Background**: White or transparent

#### Why Multiple Images?
- Show product from different angles
- Display variations (colors, sizes)
- Include packaging or labels
- Show product in use
- Better customer understanding

### 📱 Mobile Experience
- Touch to view images
- Tap thumbnail to see preview (on supported devices)
- Swipe through images in preview
- Upload from camera or gallery

### 🚀 What's New in This Update

✅ **Multiple Images Support**: Up to 5 images per product
✅ **Gallery View**: Beautiful grid layout in forms
✅ **Hover Preview**: Quick view in table without opening form
✅ **Edit & Delete**: Full control over images in edit mode
✅ **Image Count Badge**: Shows how many images at a glance
✅ **TypeScript Interfaces**: Properly typed for data integrity

### 💡 Tips & Tricks

1. **Upload all angles**: Front, back, side, top views
2. **Consistent sizing**: Keep images roughly the same size
3. **Good lighting**: Well-lit photos show products better
4. **First image matters**: The first image is the thumbnail
5. **Hover to preview**: Quickly check images without editing

### 🔒 Security & Storage

- Images stored on **Vercel Blob CDN**
- **Automatic optimization** for web delivery
- **Secure URLs** with unique identifiers
- **Fast global delivery** via CDN
- Images persist until manually deleted

---

## Quick Reference

| Action | Steps |
|--------|-------|
| Upload new images | Edit item → Browse files → Select images → Save |
| Delete image | Edit item → Click X on image → Save |
| View all images | Hover over thumbnail in table |
| Check image count | Look for "+N" badge on thumbnail |
| Edit images | Click Edit (pencil) → Modify gallery → Save |

---

**Last Updated**: January 16, 2025
**Feature Version**: 1.0.0
**Status**: ✅ Fully Deployed & Functional
