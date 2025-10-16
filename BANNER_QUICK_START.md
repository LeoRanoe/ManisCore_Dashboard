# ✅ Banner Upload - Quick Start

## What Changed?

You can now **upload banner images directly** instead of entering URLs!

---

## How It Works Now

### Before (Old Way) ❌
```
Image URL: [https://example.com/banner.jpg]  ← Had to host image yourself
Link URL: [https://yoursite.com/sale]
```

### After (New Way) ✅
```
Banner Image: [📁 Choose file or drag here]  ← Upload directly!
               ↓
              [Preview of uploaded image]
               
Link URL: [https://yoursite.com/sale]  ← Where banner links to
```

---

## Quick Steps

### 1️⃣ Add a Banner

1. Go to **Banners** page
2. Click **"Add Banner"**
3. Fill in:
   - **Title**: e.g., "Summer Sale"
   - **Banner Image**: Click to upload (or drag-and-drop)
   - **Link URL**: Where should it go when clicked? (optional)
   - **Position**: Hero, Sidebar, Footer, or Popup
4. Click **"Create"**

### 2️⃣ The Form Looks Like This

```
┌─────────────────────────────────────┐
│ Title *                             │
│ [Summer Sale 2025_____________]     │
├─────────────────────────────────────┤
│ Description                         │
│ [Save up to 50% on all items__]    │
├─────────────────────────────────────┤
│ Banner Image *                      │
│ ┌─────────────────────────────┐    │
│ │  📁 Choose file              │    │
│ │  or drag image here          │    │
│ └─────────────────────────────┘    │
│ Recommended: 1920x600px            │
├─────────────────────────────────────┤
│ Link URL (optional)                 │
│ [https://shop.com/sale_______]     │
│ Where users go when clicking        │
├─────────────────────────────────────┤
│ Position *                          │
│ [Hero (Main Banner) ▼]             │
├─────────────────────────────────────┤
│ Start Date / End Date               │
│ [mm/dd/yyyy] [mm/dd/yyyy]          │
├─────────────────────────────────────┤
│ Display Order: [0____________]     │
│ ☑ Active (display on website)      │
└─────────────────────────────────────┘
   [Cancel]  [Create]
```

---

## Image Requirements

✅ **Accepted Formats**: JPG, PNG, WebP, GIF
✅ **Max Size**: 4.5 MB
✅ **Recommended Sizes**:
- Hero Banner: 1920x600px
- Sidebar: 400x600px
- Footer: 1200x200px
- Popup: 800x600px

---

## Common Questions

### Q: What's the difference between "Banner Image" and "Link URL"?

**Banner Image** = The picture that displays
**Link URL** = Where users go when they click the banner (optional)

Example:
- Banner Image: Shows a "50% OFF" graphic
- Link URL: Takes users to `/sale` page

### Q: Can I update the image later?

Yes! Edit the banner, click "Remove" on the image, then upload a new one.

### Q: What happens to my old image?

It's automatically deleted from storage when you remove or replace it.

### Q: Do I need to host images elsewhere?

No! Images are uploaded to Vercel Blob storage automatically.

---

## Pro Tips 💡

1. **Compress images first** for faster uploads
   - Use: TinyPNG.com or Squoosh.app

2. **Use WebP format** for smaller file sizes
   - Modern browsers support it
   - Better compression than JPG/PNG

3. **Responsive design**
   - Hero banners work best at 1920x600px
   - Will auto-scale on mobile devices

4. **Schedule banners**
   - Set Start Date for future campaigns
   - Set End Date to auto-disable after campaign

5. **Display order matters**
   - Lower numbers show first (0, 1, 2...)
   - Use for seasonal promotions

---

## Troubleshooting

### ❌ "File too large"
→ Compress image to under 4.5MB

### ❌ "Failed to upload"
→ Check internet connection
→ Try a different image format

### ❌ "Invalid file type"
→ Only image files allowed (JPG, PNG, WebP, GIF)

### ❌ Banner not showing on website
→ Check "Active" checkbox is ticked
→ Verify Start/End dates include today
→ Confirm position matches your layout

---

## Need Help?

Check the full guide: `BANNER_UPLOAD_GUIDE.md`
