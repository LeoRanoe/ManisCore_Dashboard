# Quick Start: Get Your Vercel Blob Token

## Step 1: Go to Vercel Storage
Visit: https://vercel.com/dashboard/stores

## Step 2: Create a Blob Store
1. Click **"Create Database"** or **"Create Store"**
2. Select **"Blob"**
3. Name it (e.g., "product-images")
4. Click **"Create"**

## Step 3: Get Your Token
1. Click on your new Blob store
2. Go to **Settings** tab
3. Look for **"Environment Variables"** section
4. Copy the `BLOB_READ_WRITE_TOKEN` value

## Step 4: Add to Vercel Project
1. Go to your project: https://vercel.com/dashboard
2. Select your project: **maniscore_dashboard**
3. Go to **Settings** → **Environment Variables**
4. Add new variable:
   - Name: `BLOB_READ_WRITE_TOKEN`
   - Value: [paste token here]
   - Environments: **Select ALL** (Production, Preview, Development)
5. Click **Save**

## Step 5: Redeploy
After adding the token:
- Vercel will prompt to redeploy
- Click **"Redeploy"** or
- Push any change to GitHub to trigger auto-deploy

## Verification
Once redeployed, test by:
1. Go to your app: https://manis-core-dashboard-8u5ueixw5-leoranoes-projects.vercel.app
2. Navigate to Inventory → Items
3. Click "Add Item"
4. Try uploading an image
5. ✅ Success if image uploads and displays

## Troubleshooting
If upload fails:
- Check environment variable is set in Vercel
- Verify you selected ALL environments
- Confirm you clicked "Redeploy" after adding the token
- Check browser console for error messages

## Quick Links
- 📦 Vercel Storage: https://vercel.com/dashboard/stores
- ⚙️ Project Settings: https://vercel.com/dashboard (select project → Settings)
- 📖 Full Guide: See `VERCEL_BLOB_SETUP.md`

---

**Need Help?**
- Vercel Blob Docs: https://vercel.com/docs/storage/vercel-blob
- Vercel Support: https://vercel.com/support
