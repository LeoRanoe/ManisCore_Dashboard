# 🔐 Authentication System - Updated Configuration

## ✅ Latest Changes (October 6, 2025)

### Admin User Requirements
1. **Default Admin User**
   - Email: `admin@maniscor.com`
   - Password: `admin123`
   - Role: ADMIN
   - **No company association** - System-wide administrator
   - **Cannot be deleted** - Protected at API level

2. **Session Management**
   - JWT-based sessions with 30-day expiration
   - Proper handling of null companyId for admin users
   - New users always redirected to login screen

3. **Admin Protection**
   - Admin user (`admin@maniscor.com`) cannot be deleted via API
   - Protection in both single and bulk delete operations
   - Returns 403 Forbidden if deletion is attempted

## 🔑 Login Credentials

**System Administrator:**
- Email: `admin@maniscor.com`
- Password: `admin123`
- Access: Full system access, no company restrictions

**Regular Users** (from seed data):
- Email: See seed.ts for other test users
- Password: `password123`
- Access: Company-specific access

## 📊 Database Schema Changes

### User Model Updates
```prisma
model User {
  companyId String?  // Now optional (nullable)
  company   Company? // Optional relation
  // ... other fields
}
```

- **companyId is now optional** - Allows admin to exist without company
- Admin users have `companyId = null`
- Regular users must have a company association

## 🛡️ Security Features

### Admin Protection
1. **API Level Protection**
   - Single user delete: Checks email before deletion
   - Bulk user delete: Filters out admin from deletion list
   - Returns clear error message when protection triggered

2. **Default Setup**
   - Admin is created automatically via `setup-admin.ts` script
   - Script is idempotent (safe to run multiple times)
   - Admin credentials are reset on each run

### Session Security
- JWT tokens with 30-day expiration
- Secure password hashing with bcryptjs (10 rounds)
- Session includes user ID, role, and company ID (or null for admin)
- Middleware protects all routes except `/login` and `/api/auth/*`

## 📁 Key Files Modified

### Schema & Database
- `prisma/schema.prisma` - Made companyId optional
- `scripts/setup-admin.ts` - Admin user setup script

### Authentication
- `auth.ts` - Updated to handle nullable companyId
- `auth.config.ts` - Updated TypeScript types
- `middleware.ts` - Route protection

### API Protection
- `src/app/api/users/[id]/route.ts` - Single delete protection
- `src/app/api/users/bulk/route.ts` - Bulk delete protection

### Validation & UI
- `lib/validations.ts` - Made companyId optional in schema
- `components/users/user-form-dialog.tsx` - Added "None" option for admin

## 🚀 Setup Instructions

### 1. Initialize Admin User
Run this script to create/update the admin user:
```bash
pnpm tsx scripts/setup-admin.ts
```

### 2. Environment Variables
Ensure `.env` contains:
```bash
AUTH_SECRET="your-random-secret-here"
DATABASE_URL="your-database-url"
DIRECT_URL="your-direct-url"
```

### 3. Database Migrations
```bash
pnpm db:push
pnpm db:generate
```

## 🧪 Testing Admin Features

### Test Admin Login
1. Visit http://localhost:3000
2. Login with `admin@maniscor.com` / `admin123`
3. Verify access to all companies and features

### Test Admin Protection
1. Go to Users page
2. Try to delete the admin user
3. Should see error: "Cannot delete system administrator"

### Test New User Flow
1. Open incognito/private window
2. Navigate to http://localhost:3000
3. Should be redirected to `/login` immediately
4. No cached session should exist

## 📝 API Responses

### Attempting to Delete Admin
```json
{
  "error": "Cannot delete system administrator. This user is protected.",
  "status": 403
}
```

### Admin Session Structure
```json
{
  "user": {
    "id": "user_id_here",
    "email": "admin@maniscor.com",
    "name": "System Administrator",
    "role": "ADMIN",
    "companyId": null
  }
}
```

## 🔄 Deployment Checklist

Before deploying to production:

1. ✅ Run `pnpm tsx scripts/setup-admin.ts` to create admin
2. ✅ Set `AUTH_SECRET` in production environment
3. ✅ Verify database schema is up to date
4. ✅ Test admin login works
5. ✅ Test admin cannot be deleted
6. ✅ Test new users are redirected to login

## 🆘 Troubleshooting

### Admin User Not Found
```bash
pnpm tsx scripts/setup-admin.ts
```

### Session Not Persisting
- Check AUTH_SECRET is set in .env
- Clear browser cookies and try again
- Verify middleware is not blocking auth routes

### Cannot Delete Users
- If admin: Expected behavior (protection working)
- If regular user: Check API error message for details

---

**Status**: ✅ Ready for deployment  
**Build**: ✅ Passing  
**Admin**: ✅ Protected  
**Session**: ✅ Configured
