-- ============================================
-- SAFE MIGRATION: Stock Batch System
-- ============================================
-- This migration PRESERVES all existing data
-- Old system continues to work alongside new system
-- NO DATA IS DELETED OR LOST
-- ============================================

-- Step 1: Create StockBatch table (new, doesn't touch existing data)
CREATE TABLE IF NOT EXISTS "stock_batches" (
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
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,
    "locationId" TEXT,
    "assignedUserId" TEXT,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- Step 2: Add batch system flag to items (doesn't modify existing data)
ALTER TABLE "items" 
ADD COLUMN IF NOT EXISTS "useBatchSystem" BOOLEAN DEFAULT false;

-- Step 3: Make old columns nullable for future flexibility
-- (Allows items to exist with only batch data eventually)
ALTER TABLE "items" ALTER COLUMN "status" DROP NOT NULL;
ALTER TABLE "items" ALTER COLUMN "quantityInStock" DROP NOT NULL;
ALTER TABLE "items" ALTER COLUMN "freightCostUSD" DROP NOT NULL;

-- Step 4: Add foreign key constraints (just creates relationships)
ALTER TABLE "stock_batches" 
ADD CONSTRAINT "stock_batches_itemId_fkey" 
FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_batches" 
ADD CONSTRAINT "stock_batches_locationId_fkey" 
FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "stock_batches" 
ADD CONSTRAINT "stock_batches_assignedUserId_fkey" 
FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: COPY (not move!) existing data to stock_batches
-- This creates batch records FROM items, keeping items unchanged
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
    COALESCE("quantityInStock", 0) as quantity,
    COALESCE("status", 'ToOrder') as status,
    "costPerUnitUSD",
    COALESCE("freightCostUSD", 0) as "freightCostUSD",
    "orderDate",
    "expectedArrival",
    "orderNumber",
    "notes",
    "createdAt",
    CURRENT_TIMESTAMP as "updatedAt",
    "id" as "itemId",
    "locationId",
    "assignedUserId"
FROM "items"
WHERE "quantityInStock" > 0 OR "status" IS NOT NULL
ON CONFLICT DO NOTHING;  -- Safety: don't overwrite if batch already exists

-- Step 6: Create indexes for performance
CREATE INDEX IF NOT EXISTS "stock_batches_itemId_idx" ON "stock_batches"("itemId");
CREATE INDEX IF NOT EXISTS "stock_batches_locationId_idx" ON "stock_batches"("locationId");
CREATE INDEX IF NOT EXISTS "stock_batches_status_idx" ON "stock_batches"("status");
CREATE INDEX IF NOT EXISTS "stock_batches_assignedUserId_idx" ON "stock_batches"("assignedUserId");

-- ============================================
-- VERIFICATION QUERIES (Run these after migration)
-- ============================================

-- Query 1: Check if data was copied correctly
-- Expected: All items should have matching quantities
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    
    RAISE NOTICE 'Total items: %', (SELECT COUNT(*) FROM items);
    RAISE NOTICE 'Total batches created: %', (SELECT COUNT(*) FROM stock_batches);
    RAISE NOTICE 'Items with batches: %', (SELECT COUNT(DISTINCT "itemId") FROM stock_batches);
END $$;

-- Query 2: Verify quantities match (should return 0 mismatches)
SELECT 
    COUNT(*) as mismatch_count
FROM (
    SELECT 
        i.id,
        i.name,
        COALESCE(i."quantityInStock", 0) as old_qty,
        COALESCE(SUM(sb.quantity), 0) as new_qty
    FROM items i
    LEFT JOIN stock_batches sb ON sb."itemId" = i.id
    GROUP BY i.id, i.name, i."quantityInStock"
    HAVING COALESCE(i."quantityInStock", 0) != COALESCE(SUM(sb.quantity), 0)
) mismatches;

-- ============================================
-- ROLLBACK COMMANDS (If needed - keeps data safe)
-- ============================================
-- Uncomment and run if you need to rollback:

-- DROP TABLE IF EXISTS "stock_batches" CASCADE;
-- ALTER TABLE "items" DROP COLUMN IF EXISTS "useBatchSystem";
-- ALTER TABLE "items" ALTER COLUMN "status" SET NOT NULL;
-- ALTER TABLE "items" ALTER COLUMN "quantityInStock" SET NOT NULL;
-- ALTER TABLE "items" ALTER COLUMN "freightCostUSD" SET NOT NULL;

-- Your original data remains 100% intact!

