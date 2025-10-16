# ManisCore Dashboard - Deployment Configuration

## 🚀 Vercel Environment Variables

### Required Variables

Add these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Database (REQUIRED)
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
DIRECT_URL=postgresql://user:password@host/database?sslmode=require

# NextAuth (REQUIRED)
NEXTAUTH_URL=https://manis-core-dashboard.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-here-generate-with-openssl

# Vercel Blob Storage (REQUIRED for image uploads)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxxxxxxxxxxxx
```

## 🔑 Generating Secrets

### NEXTAUTH_SECRET
```bash
openssl rand -base64 32
```

### Vercel Blob Token
1. Go to Vercel Dashboard → Storage
2. Create a new Blob Store
3. Copy the `BLOB_READ_WRITE_TOKEN`

## 📦 Build Configuration

In `vercel.json`:

```json
{
  "version": 2,
  "buildCommand": "prisma generate && pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install --frozen-lockfile",
  "framework": "nextjs"
}
```

## 🔧 Post-Deployment Setup

### 1. Initialize Database

After first deployment, run migrations:

```bash
# Option A: Using Vercel CLI
vercel env pull .env.local
pnpm prisma migrate deploy

# Option B: Using Prisma Studio
npx prisma studio
```

### 2. Create Admin User

```bash
# Local setup
pnpm tsx scripts/setup-admin.ts

# Or add manually in Prisma Studio
```

### 3. Seed Data (Optional)

```bash
pnpm prisma db seed
```

This will create:
- Sample companies
- Sample products
- Test inventory

## 🌐 CORS Configuration

The Dashboard API serves the E-Commerce frontend. CORS is configured in `next.config.js`:

```javascript
async headers() {
  return [
    {
      source: '/api/public/:path*',
      headers: [
        { key: 'Access-Control-Allow-Origin', value: '*' },
        { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS' },
        // ... more headers
      ],
    },
  ];
}
```

## 🔍 Health Check

Test the API after deployment:

```bash
# Check company endpoint
curl https://manis-core-dashboard.vercel.app/api/public/companies/nextx

# Check products endpoint
curl "https://manis-core-dashboard.vercel.app/api/public/products?companySlug=nextx&page=1&limit=10"
```

Expected response: JSON with company/product data

## ⚠️ Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if database allows connections from Vercel IPs
- For Neon DB, use pooled connection string

### Build Failures
```bash
# Common fix: Regenerate Prisma client
pnpm prisma generate
pnpm build
```

### API Returns 404
- Check if company `isPublic: true`
- Check if items `isPublic: true`
- Verify slugs match exactly

### Image Upload Issues
- Verify `BLOB_READ_WRITE_TOKEN` is set
- Check Vercel Blob Storage quota
- Ensure `next.config.js` has correct image config

## 🔐 Security Checklist

- [ ] `NEXTAUTH_SECRET` is set and unique
- [ ] Database credentials are secure
- [ ] CORS is configured (not wide open in production)
- [ ] Rate limiting enabled (optional)
- [ ] Environment variables not in Git

## 📊 Monitoring

### Vercel Dashboard
- Check function logs for errors
- Monitor build times
- Watch bandwidth usage

### Database
- Monitor connection pool
- Check query performance
- Set up backups

## 🚀 Deployment Commands

```bash
# Deploy to production
git add .
git commit -m "Deploy updates"
git push origin main

# Force rebuild (if needed)
# Go to Vercel Dashboard → Deployments → "..." → Redeploy
```

## 📞 API Endpoints

### Public Endpoints (for E-Commerce)
- `GET /api/public/companies/:slug`
- `GET /api/public/products?companySlug=:slug`
- `GET /api/public/products/:slug?companySlug=:slug`

### Protected Endpoints (requires auth)
- `GET /api/companies`
- `POST /api/companies`
- `GET /api/inventory`
- `POST /api/inventory`
- ... more

---

**Last Updated**: October 16, 2025
