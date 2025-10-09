# Dashboard Filter Accuracy Fix

## Date: October 9, 2025
## Commit: `68a0c9d`

## Problem Statement

The dashboard filters were not working accurately:
1. **Company filter**: When selecting a specific company, it should ONLY show that company's stats (not multi-company breakdowns)
2. **User filter**: Should show items/batches that the user:
   - Is directly assigned to, OR
   - Manages through locations they oversee (as location manager)

## Root Cause

The previous implementation had several issues:
1. User filter only checked direct assignment (`assignedUserId`), ignoring location management
2. Company metrics were shown even when filtering by a specific company
3. Cash balances didn't aggregate properly for "All Companies" view
4. The location management relationship wasn't considered in filtering logic

## Solution Implemented

### 1. Enhanced User Filter Logic

**For Batch-System Items:**
```typescript
// Query managed locations
const managedLocations = await prisma.location.findMany({
  where: { managerId: userId },
  select: { id: true }
})

// Build batch filter with OR condition
batchWhere.OR = [
  { assignedUserId: userId },              // Direct assignment
  { locationId: { in: managedLocationIds } } // Managed locations
]
```

**For Legacy Items:**
```typescript
const isAssignedToUser = item.assignedUserId === userId
const isInManagedLocation = item.locationId && managedLocationIds.includes(item.locationId)

if (!isAssignedToUser && !isInManagedLocation) {
  return false // Filter out
}
```

### 2. Fixed Company Filter Isolation

**Before:**
- Company filter applied at item level
- Company metrics still showed for specific companies
- Cash balances only from selected company

**After:**
```typescript
// When specific company is selected
if (companyId && companyId !== 'all') {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { cashBalanceSRD, cashBalanceUSD }
  })
  // Use only this company's cash
}

// When "All Companies" is selected
else {
  const companies = await prisma.company.findMany({
    select: { cashBalanceSRD, cashBalanceUSD }
  })
  // Aggregate all companies' cash
}
```

### 3. Fixed Company Metrics Display

**Now only shows when:**
- Company filter = "All Companies"
- User filter = "All Users"
- Location filter = "All Locations"

```typescript
if ((!companyId || companyId === 'all') && 
    (!userId || userId === 'all') && 
    (!locationId || locationId === 'all')) {
  // Show company breakdown
}
```

This ensures that:
- When viewing a specific company → No company metrics (you're already filtered)
- When viewing all companies → Show breakdown by company
- When filtering by user/location → No company metrics (irrelevant context)

### 4. Database Schema Utilized

```
Location Model:
- managerId: String? (references User.id)
- manager: User? (relation)

User can:
1. Be assigned to batches/items directly (assignedUserId)
2. Manage locations (managerId in Location)
```

## Filter Behavior Matrix

| Filter Combination | What Shows | Company Metrics | User Metrics |
|-------------------|------------|-----------------|--------------|
| All Companies + All Users + All Locations | Everything | ✅ Yes (breakdown by company) | ✅ Yes (breakdown by user) |
| Specific Company + All Users + All Locations | That company only | ❌ No (already filtered) | ✅ Yes (users in that company) |
| All Companies + Specific User + All Locations | Items/batches assigned to or managed by user | ❌ No (user context) | ❌ No (already filtered) |
| Specific Company + Specific User | That user's items in that company | ❌ No | ❌ No |

## User Filter Examples

**Example 1: User manages "Warehouse A"**
- Filter by that user → Shows all batches in Warehouse A + batches directly assigned to user

**Example 2: User has batches assigned but manages no locations**
- Filter by that user → Shows only directly assigned batches

**Example 3: User manages multiple locations**
- Filter by that user → Shows batches from ALL managed locations + directly assigned batches

## Technical Details

### Location Management Query
```typescript
const managedLocations = await prisma.location.findMany({
  where: { managerId: userId },
  select: { id: true }
})
const managedLocationIds = managedLocations.map(loc => loc.id)
```

### Batch Filter with OR Logic
```typescript
if (managedLocationIds.length > 0) {
  batchWhere.OR = [
    { assignedUserId: userId },
    { locationId: { in: managedLocationIds } }
  ]
} else {
  batchWhere.assignedUserId = userId
}
```

### Legacy Item Filter
```typescript
const isAssignedToUser = item.assignedUserId === userId
const isInManagedLocation = item.locationId && managedLocationIds.includes(item.locationId)
return isAssignedToUser || isInManagedLocation
```

## Testing Checklist

✅ Company filter shows only that company's data
✅ User filter includes directly assigned items
✅ User filter includes items in managed locations
✅ Company metrics only show for "All Companies" view
✅ User metrics only show when not filtering by user
✅ Cash balances aggregate correctly for all companies
✅ Filters work together (company + user, company + location, etc.)
✅ Legacy items filter correctly alongside batch-system items

## Deployment

- **Build Status**: ✅ Successful
- **Git Commit**: `68a0c9d`
- **GitHub Branch**: `main`
- **Vercel Deployment**: ✅ Live in production
- **Deployment URL**: https://manis-core-dashboard-4i41ryt6p-leoranoes-projects.vercel.app

## Files Modified

1. `src/app/api/dashboard-metrics/route.ts` - Core filtering logic
   - Added managed location query
   - Enhanced user filter with OR logic
   - Fixed company cash aggregation
   - Fixed metrics display conditions

## Benefits

1. **Accurate User Filtering**: Users see all inventory they're responsible for (direct + managed)
2. **Clear Company Isolation**: Selecting a company shows only that company's stats
3. **Better UX**: Metrics only show when they provide meaningful context
4. **Complete Coverage**: Both batch-system and legacy items filter correctly
5. **Manager Support**: Location managers can see their managed inventory

## Recommendations

1. ✅ **User permissions**: Consider role-based access (ADMIN, MANAGER, STAFF)
2. ✅ **Location hierarchy**: Current implementation supports flat location management
3. 💡 **Future**: Add "My Team" filter to show all users reporting to a manager
4. 💡 **Future**: Add filter badges showing active filters
5. 💡 **Future**: Add "Reset Filters" button for quick clearing
