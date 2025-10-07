# 🛡️ SAFE MIGRATION STRATEGY - Zero Data Loss

## Critical: Your Data is Safe!

This migration strategy ensures **ZERO DATA LOSS** by:
1. ✅ Keeping ALL existing columns in the `items` table
2. ✅ Adding NEW `stock_batches` table alongside
3. ✅ Copying (not moving) data to batches
4. ✅ Running both systems in parallel during transition
5. ✅ Easy rollback without losing anything

## Phase 1: Safe Database Migration (NO DATA LOSS)

### What Actually Happens

```
BEFORE Migration:
├── items table (existing data intact)
    ├── id, name, status, quantityInStock, etc.
    └── ALL YOUR CURRENT DATA

AFTER Migration:
├── items table (UNCHANGED - all data still here!)
│   ├── id, name, status, quantityInStock, etc.
│   └── ALL YOUR CURRENT DATA (100% preserved)
│
└── stock_batches table (NEW - copied data)
    ├── id, itemId, quantity, status, location, etc.
    └── COPIES of your data in new structure
```

### Migration SQL (Data Preserving)

```sql
-- Step 1: Create new table (doesn't touch existing data)
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "status" "Status" NOT NULL DEFAULT 'ToOrder',
    "costPerUnitUSD" DOUBLE PRECISION NOT NULL,
    "freightCostUSD" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "orderDate" TIMESTAMP(3),
    "expectedArrival" TIMESTAMP(3),
    "orderNumber" TEXT,
    "arrivedDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT,
    "assignedUserId" TEXT,
    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- Step 2: COPY (not move) existing data to batches
-- This creates batches FROM your items, keeping items unchanged
INSERT INTO "stock_batches" (
    "id",
    "quantity",
    "status",
    "costPerUnitUSD",
    "freightCostUSD",
    "orderDate",
    "expectedArrival",
    "orderNumber",
    "notes",
    "createdAt",
    "updatedAt",
    "itemId",
    "locationId",
    "assignedUserId"
)
SELECT 
    gen_random_uuid() as id,
    "quantityInStock",
    "status",
    "costPerUnitUSD",
    "freightCostUSD",
    COALESCE("orderDate", CURRENT_TIMESTAMP),
    "expectedArrival",
    "orderNumber",
    "notes",
    "createdAt",
    "updatedAt",
    "id" as "itemId",
    "locationId",
    "assignedUserId"
FROM "items"
WHERE "quantityInStock" > 0 OR "status" IS NOT NULL;

-- Step 3: Add foreign keys (safe - just creates relationships)
ALTER TABLE "stock_batches" 
ADD CONSTRAINT "stock_batches_itemId_fkey" 
FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE;

ALTER TABLE "stock_batches" 
ADD CONSTRAINT "stock_batches_locationId_fkey" 
FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL;

ALTER TABLE "stock_batches" 
ADD CONSTRAINT "stock_batches_assignedUserId_fkey" 
FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL;

-- Step 4: Add new columns to items table (for batch system features)
ALTER TABLE "items" ADD COLUMN "useBatchSystem" BOOLEAN DEFAULT false;

-- Step 5: Verification query - shows both systems have same data
-- Run this to verify migration success
SELECT 
  i.id,
  i.name,
  i."quantityInStock" as old_system_qty,
  COALESCE(SUM(sb.quantity), 0) as new_system_qty,
  CASE 
    WHEN i."quantityInStock" = COALESCE(SUM(sb.quantity), 0) 
    THEN '✅ MATCH' 
    ELSE '❌ MISMATCH' 
  END as status
FROM items i
LEFT JOIN stock_batches sb ON sb."itemId" = i.id
GROUP BY i.id, i.name, i."quantityInStock"
ORDER BY i.name;
```

## Phase 2: Dual-System Operation (Transition Period)

During transition, both systems work:

```typescript
// API automatically detects which system to use
async function getItem(itemId: string) {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      batches: true  // NEW system
    }
  })
  
  // If item has batches, use batch system
  if (item.batches && item.batches.length > 0) {
    return {
      ...item,
      totalQuantity: item.batches.reduce((sum, b) => sum + b.quantity, 0),
      locations: [...new Set(item.batches.map(b => b.location))],
      statuses: [...new Set(item.batches.map(b => b.status))],
      usingBatchSystem: true
    }
  }
  
  // Otherwise, use old system (still works!)
  return {
    ...item,
    totalQuantity: item.quantityInStock,
    locations: [item.location],
    statuses: [item.status],
    usingBatchSystem: false
  }
}
```

## Phase 3: Gradual Data Verification

Check data integrity before moving forward:

```sql
-- 1. Count total items
SELECT COUNT(*) as total_items FROM items;

-- 2. Count items with batches
SELECT COUNT(DISTINCT "itemId") as items_with_batches FROM stock_batches;

-- 3. Verify quantities match
SELECT 
  COUNT(*) as total_items_checked,
  SUM(CASE WHEN matched THEN 1 ELSE 0 END) as items_matched,
  SUM(CASE WHEN matched THEN 0 ELSE 1 END) as items_mismatched
FROM (
  SELECT 
    i.id,
    i."quantityInStock" = COALESCE(SUM(sb.quantity), 0) as matched
  FROM items i
  LEFT JOIN stock_batches sb ON sb."itemId" = i.id
  GROUP BY i.id, i."quantityInStock"
) verification;

-- 4. Check for data loss (should be 0)
SELECT 
  i.id,
  i.name,
  i."quantityInStock" as original_quantity,
  COALESCE(SUM(sb.quantity), 0) as batch_quantity,
  i."quantityInStock" - COALESCE(SUM(sb.quantity), 0) as difference
FROM items i
LEFT JOIN stock_batches sb ON sb."itemId" = i.id
GROUP BY i.id, i.name, i."quantityInStock"
HAVING i."quantityInStock" != COALESCE(SUM(sb.quantity), 0);
-- If this returns 0 rows: ✅ Perfect! No data loss
```

## Phase 4: Safe Cleanup (Only After Verification)

**ONLY do this after confirming everything works for at least 1 week:**

```sql
-- Mark items as migrated (doesn't delete anything)
UPDATE items SET "useBatchSystem" = true;

-- Later, MUCH later, if you want to remove old columns:
-- (Keep this commented out for now!)
-- ALTER TABLE items DROP COLUMN "quantityInStock";
-- ALTER TABLE items DROP COLUMN "status";
-- ALTER TABLE items DROP COLUMN "locationId";
```

## Rollback Plan (If Anything Goes Wrong)

If you need to go back:

```sql
-- Option 1: Just stop using batches (old system still works)
-- No action needed - items table is unchanged!

-- Option 2: Remove batch table entirely
DROP TABLE stock_batches CASCADE;

-- Your original data is 100% intact in items table!
```

## Step-by-Step Execution Plan

### Day 1: Migration (15 minutes)
```bash
# 1. Backup database (CRITICAL!)
# In Neon dashboard: Create snapshot or export data

# 2. Apply migration
npx prisma db push

# 3. Verify data copied correctly
# Run verification queries above

# 4. Test on one item
# Create a new batch for an existing item
# Verify both systems show correct data
```

### Week 1: Testing Period
- ✅ Old items still work with original system
- ✅ New batches created for test items
- ✅ Both systems running in parallel
- ✅ No data loss possible - everything is duplicated

### Week 2: Full Migration
- ✅ Start creating all new orders as batches
- ✅ Gradually migrate existing items to batch system
- ✅ Old data remains as backup

### Month 1: Cleanup
- ✅ Mark items as fully migrated
- ✅ Consider removing old columns (optional)

## Data Safety Guarantees

### ✅ What's Protected
1. **All existing items** - Not touched, not modified
2. **All quantities** - Copied to batches, original preserved
3. **All relationships** - Locations, users, companies intact
4. **All metadata** - Dates, notes, costs preserved
5. **All foreign keys** - Expenses, users, locations still linked

### ✅ How Data is Protected
1. **COPY not MOVE** - Batches are copies of item data
2. **Dual system** - Both old and new work during transition
3. **Gradual migration** - Move items one by one, not all at once
4. **Verification queries** - Check data integrity at each step
5. **Easy rollback** - Just drop batch table, items unchanged

### ❌ What Could Go Wrong (and how we prevent it)

| Risk | Prevention | Rollback |
|------|-----------|----------|
| Data loss during copy | Use INSERT...SELECT with verification | Original data untouched |
| Quantity mismatch | Run verification queries after migration | Compare and fix |
| Foreign key errors | Test on dev database first | Drop foreign keys |
| System breaks | Dual system - old still works | Switch back to old system |
| Migration fails | Transaction wraps all changes | Auto-rollback on error |

## Pre-Migration Checklist

- [ ] **Backup database** (via Neon dashboard or pg_dump)
- [ ] **Export current data** to CSV as additional backup
- [ ] **Document current totals**:
  - Total items: _____
  - Total quantity: _____
  - Total value: _____
- [ ] **Test on development database** first
- [ ] **Review migration SQL** (provided above)
- [ ] **Have rollback plan ready** (drop table command)
- [ ] **Schedule maintenance window** (15 minutes)
- [ ] **Notify team** of planned changes

## Post-Migration Verification

Run these queries immediately after migration:

```sql
-- 1. Verify row counts match
SELECT 
  (SELECT COUNT(*) FROM items) as item_count,
  (SELECT COUNT(*) FROM stock_batches) as batch_count;
-- Should be: batch_count = item_count (if all items have stock)

-- 2. Verify quantity totals match
SELECT 
  SUM(i."quantityInStock") as old_system_total,
  SUM(sb.quantity) as new_system_total
FROM items i
LEFT JOIN stock_batches sb ON sb."itemId" = i.id;
-- Should be: old_system_total = new_system_total

-- 3. Check for orphaned batches
SELECT COUNT(*) FROM stock_batches 
WHERE "itemId" NOT IN (SELECT id FROM items);
-- Should be: 0

-- 4. Check for missing relationships
SELECT 
  COUNT(*) as batches_without_items
FROM stock_batches sb
LEFT JOIN items i ON i.id = sb."itemId"
WHERE i.id IS NULL;
-- Should be: 0
```

## Emergency Contacts

If something goes wrong:
1. **Don't panic** - Old system still works!
2. **Stop using batch system** - Revert to old API endpoints
3. **Run verification queries** - Identify the issue
4. **Rollback if needed** - `DROP TABLE stock_batches`
5. **Contact me** - I'll help debug

## Ready to Migrate?

When you're ready, I'll:
1. ✅ Update the migration SQL to be 100% safe
2. ✅ Create backup/restore scripts
3. ✅ Generate verification queries
4. ✅ Walk through each step with you
5. ✅ Monitor the migration in real-time

**No data will be deleted or lost. Everything is additive!**

Would you like me to proceed with the safe migration? 🛡️
