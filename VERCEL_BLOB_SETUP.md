# Vercel Blob Image Upload Setup Guide

This application now supports product image uploads using Vercel Blob Storage. Follow these steps to complete the setup:

## Prerequisites

- A Vercel account
- Your project deployed on Vercel (or ready to deploy)

## Setup Instructions

### 1. Create a Vercel Blob Store

1. Go to your [Vercel Dashboard](https://vercel.com/dashboard)
2. Navigate to the **Storage** tab
3. Click **Create Database** or **Create Store**
4. Select **Blob** as the storage type
5. Give your store a name (e.g., "maniscore-product-images")
6. Click **Create**

### 2. Get Your Blob Token

After creating the Blob store:

1. Click on your newly created Blob store
2. Navigate to the **Settings** tab
3. Find the **Environment Variables** section
4. Copy the `BLOB_READ_WRITE_TOKEN` value

### 3. Add Environment Variable to Vercel

#### Option A: Through Vercel Dashboard (Recommended)

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add a new environment variable:
   - **Name**: `BLOB_READ_WRITE_TOKEN`
   - **Value**: Paste the token you copied
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. **Important**: Redeploy your application for changes to take effect

#### Option B: Through Vercel CLI

```bash
vercel env add BLOB_READ_WRITE_TOKEN
# Paste your token when prompted
# Select all environments when asked

# Redeploy
vercel --prod
```

### 4. Update Local Environment (Optional - for local development)

If you want to test image uploads locally:

1. Create a `.env.local` file in your project root (if it doesn't exist)
2. Add the following:
   ```
   BLOB_READ_WRITE_TOKEN=your_actual_token_here
   ```
3. Restart your development server

**Note**: Never commit `.env.local` to version control. It's already in `.gitignore`.

### 5. Verify Setup

1. After redeploying, visit your application
2. Navigate to the inventory section
3. Try creating or editing a product
4. You should see the image upload component
5. Upload a test image to verify it works

## Features

### Image Upload Capabilities

- **Supported Formats**: All image types (JPEG, PNG, GIF, WebP, etc.)
- **Max File Size**: 4.5 MB per image
- **Storage**: Vercel Blob (CDN-optimized)
- **Features**:
  - Real-time image preview
  - Drag and drop support
  - Image deletion
  - Automatic CDN delivery

### Where Images Appear

Product images are now visible in:

1. **Item Form Dialog** - Upload/edit/delete images when creating or editing items
2. **Batch Form Dialog** - Upload/edit/delete images when creating or editing batches
3. **Item Data Table** - View thumbnails of all products
4. **Batch Data Table** - View thumbnails of all batches
5. **All Inventory Pages** - Images displayed wherever items are shown

## Troubleshooting

### Images not uploading?

1. **Check Environment Variable**: Ensure `BLOB_READ_WRITE_TOKEN` is set in Vercel
2. **Redeploy**: After adding the token, you must redeploy the application
3. **Check Browser Console**: Look for any error messages
4. **File Size**: Make sure your image is under 4.5 MB
5. **Format**: Verify the file is actually an image

### Images not displaying?

1. Check the browser's Network tab for 404 errors
2. Verify the image URL is a valid Vercel Blob URL
3. Check if the image was properly uploaded (check Vercel Blob dashboard)

### Local Development Issues

1. Ensure `.env.local` has the correct token
2. Restart your development server after adding the token
3. Try uploading a small test image first

## Cost Information

Vercel Blob Storage pricing:
- **Free Tier**: Includes some free storage and bandwidth
- **Pro/Enterprise**: See [Vercel Pricing](https://vercel.com/pricing/storage) for details
- Images are stored with automatic CDN delivery for fast loading

## Database Schema

The following fields were added to support images:

```prisma
model Item {
  // ... other fields
  imageUrl String? // Optional URL to product image
}

model StockBatch {
  // ... other fields
  imageUrl String? // Optional URL to batch image
}
```

## Security Notes

- Images are stored with public access (readable by anyone with the URL)
- Upload endpoint validates file type and size
- Only authenticated users can upload/delete images (via your app's auth)
- Deleted images are removed from Vercel Blob storage

## Support

If you encounter any issues:

1. Check the Vercel deployment logs
2. Verify all environment variables are set correctly
3. Ensure you've redeployed after adding the token
4. Check the [Vercel Blob Documentation](https://vercel.com/docs/storage/vercel-blob)

---

**Last Updated**: October 16, 2025
