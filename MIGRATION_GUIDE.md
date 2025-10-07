# Inventory System Restructuring - Stock Batch Implementation

## Overview
This migration restructures the inventory system to support:
- **Multiple locations per item** with different quantities
- **Multiple statuses per item** (e.g., some units "Ordered", others "Arrived")
- **Batch/lot tracking** with individual status, location, and cost tracking

## Database Changes

### New Model: StockBatch
Replaces the flat item structure with a batch-based system where each item can have multiple batches.

**Before:**
```
Item
├── quantityInStock: 10
├── status: "Arrived"
├── locationId: "location-1"
└── costPerUnitUSD: 50
```

**After:**
```
Item (Base product info)
├── name: "KZ Castor Pro"
├── sellingPriceSRD: 1400
└── Batches:
    ├── Batch 1: 6 units, "ToOrder", No Location
    ├── Batch 2: 2 units, "Arrived", Location A
    └── Batch 3: 2 units, "Arrived", Location B
```

## Migration Steps

### Step 1: Apply Schema Changes
```bash
npx prisma migrate dev --name add_stock_batches
```

This will:
1. Create the `stock_batches` table
2. Migrate existing items to batches
3. Remove old columns from `items` table

### Step 2: Update API Endpoints

#### Items API Changes
- `POST /api/items` - Creates item + initial batch
- `GET /api/items/:id` - Returns item with all batches aggregated
- `GET /api/items/:id/batches` - Returns all batches for an item
- `POST /api/items/:id/batches` - Add new batch to existing item
- `PATCH /api/items/:id/batches/:batchId` - Update specific batch

#### New Batch API
- `POST /api/batches` - Create new batch
- `PATCH /api/batches/:id` - Update batch (status, location, quantity)
- `DELETE /api/batches/:id` - Remove batch
- `POST /api/batches/:id/transfer` - Transfer batch to different location
- `POST /api/batches/:id/split` - Split batch into multiple batches

### Step 3: Update Frontend Components

#### Item Form Dialog
- Add "Create New Batch" vs "Edit Item Details" toggle
- Batch section with:
  - Quantity input
  - Status selector
  - Location selector
  - Order details (if ordered)

#### Item Data Table
- Show aggregated quantities across all batches
- Expandable rows to show batch details
- Status badges showing multiple statuses
- Location chips showing all locations

#### New: Batch Management Component
- List all batches for an item
- Quick actions: Transfer, Split, Update Status
- Visual indicators for location and status

## Key Features

### 1. Multi-Location Support
```typescript
// Example: Item exists in 3 locations
const item = {
  name: "KZ Castor Pro",
  batches: [
    { quantity: 5, location: "Warehouse A", status: "Arrived" },
    { quantity: 3, location: "Warehouse B", status: "Arrived" },
    { quantity: 10, location: null, status: "Ordered" }
  ]
}
// Total: 18 units (8 in stock across 2 locations, 10 on order)
```

### 2. Multi-Status Support
```typescript
// Example: Same item with different statuses
const item = {
  name: "KZ ZSN Pro 2",
  batches: [
    { quantity: 4, status: "ToOrder", location: null },
    { quantity: 6, status: "Ordered", location: null, expectedArrival: "2025-11-01" },
    { quantity: 15, status: "Arrived", location: "Main Warehouse" }
  ]
}
// Total: 25 units (4 to order, 6 ordered, 15 in stock)
```

### 3. Batch Operations

#### Transfer Between Locations
```typescript
await transferBatch(batchId, {
  fromLocation: "Warehouse A",
  toLocation: "Warehouse B",
  quantity: 3
})
```

#### Split Batch
```typescript
await splitBatch(batchId, {
  splits: [
    { quantity: 5, location: "Warehouse A" },
    { quantity: 5, location: "Warehouse B" }
  ]
})
```

#### Update Status
```typescript
await updateBatchStatus(batchId, {
  status: "Arrived",
  arrivedDate: new Date(),
  location: "Main Warehouse"
})
```

## UI Changes

### Inventory Overview
- **Status cards** show counts across ALL batches
- **Location breakdown** shows stock per location
- **Item cards** show total quantities with status indicators

### Item Details View
```
KZ Castor Pro mic (Harman Bass)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Stock: 8 units
Selling Price: SRD 1400.00

Batches:
┌─────────────────────────────────────────┐
│ Batch #1 - Ordered                       │
│ 6 units @ $20.00/unit                    │
│ Expected: Nov 15, 2025                   │
│ Location: None (In transit)              │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Batch #2 - Arrived                       │
│ 2 units @ $15.00/unit                    │
│ Arrived: Oct 1, 2025                     │
│ Location: Warehouse A                    │
└─────────────────────────────────────────┘
```

## Testing Checklist

- [ ] Create item with initial batch
- [ ] Add additional batch to existing item
- [ ] Update batch status (ToOrder → Ordered → Arrived)
- [ ] Transfer batch between locations
- [ ] Split batch into multiple locations
- [ ] Sell items (deduct from specific location)
- [ ] View aggregated quantities in overview
- [ ] Filter by location
- [ ] Filter by status
- [ ] Calculate correct profit across all batches

## Rollback Plan

If issues arise:
```sql
-- Restore old schema
ALTER TABLE "items" ADD COLUMN "status" "Status" DEFAULT 'ToOrder';
ALTER TABLE "items" ADD COLUMN "quantityInStock" INTEGER DEFAULT 0;
-- ... restore other columns

-- Aggregate batches back to items
UPDATE "items" i
SET "quantityInStock" = (
  SELECT SUM(quantity) FROM "stock_batches" 
  WHERE "itemId" = i.id
);

-- Drop stock_batches table
DROP TABLE "stock_batches";
```

## Notes

- Existing data will be automatically migrated to single batches per item
- Cash deduction logic remains the same but applies per batch
- Stock value calculations aggregate across all batches
- Location filtering now works at batch level
