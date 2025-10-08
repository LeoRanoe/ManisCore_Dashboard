# 🚀 Quick Reference: Items-Batches Sync System

## TL;DR
Items and batches are now **automatically synchronized**. When you modify batches, item quantities update automatically. No manual work needed!

## Core Concept
```
Item.quantityInStock = SUM of all batch quantities
```

## Common Operations

### ✅ Creating Items with Stock
```typescript
// 1. Create item (quantity starts at 0)
POST /api/items
{
  name: "Product Name",
  costPerUnitUSD: 20,
  sellingPriceSRD: 1400,
  companyId: "xxx"
}

// 2. Add stock via batch
POST /api/batches
{
  itemId: "xxx",
  quantity: 10,
  status: "Arrived",
  costPerUnitUSD: 20
}
// ✅ Item quantity is now 10
```

### ✅ Adding More Stock
```typescript
// Just create another batch
POST /api/batches
{
  itemId: "xxx",
  quantity: 5,
  status: "Ordered"
}
// ✅ Item quantity is now 15
```

### ✅ Selling Items
```typescript
// Update batch to reduce quantity
PATCH /api/batches/{batchId}
{
  quantity: 7  // was 10
}
// ✅ Item quantity decreases by 3
```

### ✅ Removing Stock
```typescript
// Delete the batch
DELETE /api/batches/{batchId}
// ✅ Item quantity decreases automatically
```

## Important Functions

### In Your Code
```typescript
import { syncItemQuantityFromBatches } from '@/lib/utils'

// After any batch operation
await syncItemQuantityFromBatches(itemId)
```

### From Terminal
```bash
# Check if everything is in sync
npm run validate:batches

# Fix any issues automatically
npm run validate:batches:fix
```

## API Endpoints That Auto-Sync

✅ `POST /api/batches` - Creates batch → syncs item
✅ `PATCH /api/batches/[id]` - Updates batch → syncs item  
✅ `DELETE /api/batches/[id]` - Deletes batch → syncs item
✅ `POST /api/items` - Creates item → syncs if has batches
✅ `PUT /api/items/[id]` - Updates item → syncs if batch system

## Legacy System

For items with `useBatchSystem = false`:
```typescript
// Use old inventory actions API
POST /api/inventory/actions
{
  action: "sell" | "add" | "remove",
  itemId: "xxx",
  quantity: 5
}
```

## Best Practices

### ✅ DO
- Use batches for all stock operations
- Let the system auto-sync
- Run validation periodically
- Check batch system flag before operations

### ❌ DON'T  
- Manually update `item.quantityInStock` for batch items
- Mix batch and non-batch operations
- Skip validation after bulk changes

## Quick Checks

### Is item using batches?
```typescript
const item = await prisma.item.findUnique({
  where: { id: itemId }
})
console.log(item.useBatchSystem) // true = batch system
```

### Get item with batch totals
```typescript
GET /api/items?companyId=xxx
// Returns items with quantityInStock auto-calculated
```

### Validate single item
```typescript
import { validateItemBatchConsistency } from '@/lib/utils'

const result = await validateItemBatchConsistency(itemId)
console.log(result.valid)
console.log(result.message)
```

## Troubleshooting

### Problem: Quantities don't match
```bash
npm run validate:batches:fix
```

### Problem: Need to resync all items
```typescript
import { syncAllBatchSystemItems } from '@/lib/utils'
await syncAllBatchSystemItems()
```

### Problem: Can't tell if item uses batches
```sql
SELECT id, name, "useBatchSystem", "quantityInStock" 
FROM items 
WHERE id = 'xxx';
```

## File Locations

- **Sync Functions:** `lib/utils.ts`
- **Batch APIs:** `src/app/api/batches/`
- **Item APIs:** `src/app/api/items/`
- **Validation Script:** `scripts/validate-batch-consistency.ts`
- **Full Docs:** `BATCH_ITEM_SYNC_GUIDE.md`

## Need Help?

1. Read `BATCH_ITEM_SYNC_GUIDE.md` for detailed docs
2. Check `SYNC_IMPLEMENTATION_SUMMARY.md` for implementation details
3. Run validation script to diagnose issues
4. Check console logs for sync operations

---

**Remember:** The system handles synchronization automatically. Just use the batch APIs and everything stays in sync! 🎉
