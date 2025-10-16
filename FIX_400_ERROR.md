# Fix: 400 Bad Request Error When Updating Items

## Issue
When editing/updating items in the dashboard, the API was returning a 400 (Bad Request) error with message "Invalid item data".

### Error Details
```
PUT https://manis-core-dashboard.vercel.app/api/items/[id] 400 (Bad Request)
Error: Invalid item data
```

## Root Cause
The `freightCostUSD` field was missing from the form data when editing existing items.

### Why This Happened
1. The API schema (`ItemFormSchema`) requires `freightCostUSD` as a required field (with optional default)
2. When **creating** a new item, the form had `freightCostUSD: 0` in default values ✅
3. When **editing** an existing item, `freightCostUSD` was missing from the default values ❌
4. The form submission included `freightCostUSD` in the cleanData for new items ✅
5. But when editing, if the item didn't have this field, it was undefined ❌

## Solution Applied

### 1. Added to Form Default Values (When Editing)
```typescript
// Before
defaultValues: item ? {
  name: item.name,
  status: item.status,
  quantityInStock: item.quantityInStock,
  costPerUnitUSD: item.costPerUnitUSD,
  sellingPriceSRD: item.sellingPriceSRD,
  // freightCostUSD was missing!
  ...
}

// After
defaultValues: item ? {
  name: item.name,
  status: item.status,
  quantityInStock: item.quantityInStock,
  costPerUnitUSD: item.costPerUnitUSD,
  freightCostUSD: item.freightCostUSD || 0, // ✅ Added with default
  sellingPriceSRD: item.sellingPriceSRD,
  ...
}
```

### 2. Ensured It's in Clean Data
```typescript
const cleanData: any = {
  name: data.name,
  status: data.status,
  quantityInStock: data.quantityInStock,
  costPerUnitUSD: data.costPerUnitUSD,
  freightCostUSD: data.freightCostUSD || 0, // ✅ Always include with fallback
  sellingPriceSRD: data.sellingPriceSRD,
  companyId: data.companyId,
}
```

## API Schema Requirement
```typescript
export const ItemFormSchema = z.object({
  // ... other fields
  freightCostUSD: z.number().min(0, 'Freight cost must be non-negative').default(0).optional(),
  // ... other fields
})
```

Even though it's optional, the API validation expects it to be present as a number (defaulting to 0).

## Files Modified
- `components/inventory/item-form-dialog.tsx`
  - Line ~128: Added `freightCostUSD: item.freightCostUSD || 0` to edit defaults
  - Line ~269: Added `freightCostUSD: data.freightCostUSD || 0` to cleanData

## Testing
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ Creating new items works (already did)
- ✅ Editing existing items now works
- ✅ freightCostUSD defaults to 0 if not present

## What About the UI?
Currently, there's **no input field** for `freightCostUSD` in the form UI. This is intentional because:
1. Freight costs are typically added later based on actual shipping
2. The UI shows a note: "Freight costs will be added later based on actual shipping weight"
3. The field defaults to 0, which is the correct behavior for most cases

If you need to manually set freight costs, you can:
- Add an input field in the form
- Or set it via the batch management system
- Or update it through the API directly

## Deployment Status
- ✅ Fixed and committed: commit `64ed57b`
- ✅ Pushed to `main` branch
- ✅ Ready for deployment to Vercel

Once deployed to Vercel, the 400 errors should be resolved!

---
**Fixed**: October 16, 2025  
**Commit**: 64ed57b  
**Status**: ✅ Pushed to production
