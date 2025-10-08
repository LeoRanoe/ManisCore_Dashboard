# 🔄 Items-Batches Synchronization System

## Overview

This system ensures that **Items** and **Batches** tables are always consistent and synchronized. The `Item.quantityInStock` field automatically reflects the sum of all batch quantities for that item.

## Key Concepts

### 1. Automatic Synchronization
- **Item.quantityInStock** = SUM of all batch quantities for that item
- All batch operations (CREATE, UPDATE, DELETE) automatically trigger item quantity updates
- No manual synchronization required in normal operations

### 2. Batch System Flag
```typescript
useBatchSystem: Boolean @default(true)
```
- **true** (default): Item uses batch system, quantity is auto-synced from batches
- **false**: Legacy item, quantity is managed directly

## Architecture

### Database Schema
```prisma
model Item {
  id              String   @id @default(cuid())
  name            String
  useBatchSystem  Boolean  @default(true)  // Enables batch tracking
  quantityInStock Int?     @default(0)     // Auto-synced from batches
  batches         StockBatch[] @relation("ItemBatches")
  // ... other fields
}

model StockBatch {
  id       String @id @default(cuid())
  itemId   String
  quantity Int    @default(0)
  status   Status
  item     Item   @relation("ItemBatches", fields: [itemId], references: [id])
  // ... other fields
}
```

### Sync Function
Located in `/lib/utils.ts`:

```typescript
syncItemQuantityFromBatches(itemId: string)
```
- Calculates total quantity from all batches
- Updates item.quantityInStock to match
- Only runs for items with useBatchSystem = true

## Integration Points

### 1. Batch API Routes
All batch operations automatically sync the parent item:

**POST /api/batches** - Create batch
```typescript
const batch = await prisma.stockBatch.create({ ... })
await syncItemQuantityFromBatches(itemId)
```

**PATCH /api/batches/[id]** - Update batch
```typescript
const updatedBatch = await prisma.stockBatch.update({ ... })
await syncItemQuantityFromBatches(updatedBatch.itemId)
```

**DELETE /api/batches/[id]** - Delete batch
```typescript
await prisma.stockBatch.delete({ ... })
await syncItemQuantityFromBatches(batch.itemId)
```

### 2. Items API Routes
Item operations check and sync when needed:

**POST /api/items** - Create item
```typescript
const item = await prisma.item.create({ ... })
if (item.useBatchSystem) {
  await syncItemQuantityFromBatches(item.id)
}
```

**PUT /api/items/[id]** - Update item
```typescript
const updatedItem = await prisma.item.update({ ... })
if (updatedItem.useBatchSystem) {
  await syncItemQuantityFromBatches(updatedItem.id)
}
```

### 3. Inventory Actions
Legacy route for non-batch items:

**POST /api/inventory/actions**
- Only works for items with `useBatchSystem = false`
- Batch-system items should use batch API routes instead

## Usage Examples

### Creating a New Item with Batches

```typescript
// 1. Create the item (defaults to useBatchSystem = true)
const item = await fetch('/api/items', {
  method: 'POST',
  body: JSON.stringify({
    name: 'KZ Castor Pro',
    costPerUnitUSD: 20,
    sellingPriceSRD: 1400,
    companyId: 'company-id'
  })
})

// 2. Add initial batch
const batch = await fetch('/api/batches', {
  method: 'POST',
  body: JSON.stringify({
    itemId: item.id,
    quantity: 10,
    status: 'Ordered',
    costPerUnitUSD: 20,
    locationId: 'warehouse-1'
  })
})
// Item quantity is now automatically 10
```

### Adding More Stock

```typescript
// Create another batch
await fetch('/api/batches', {
  method: 'POST',
  body: JSON.stringify({
    itemId: item.id,
    quantity: 5,
    status: 'Arrived',
    costPerUnitUSD: 18,
    locationId: 'warehouse-2'
  })
})
// Item quantity is now automatically 15 (10 + 5)
```

### Selling Items

```typescript
// Option 1: Update batch quantity (recommended)
await fetch(`/api/batches/${batchId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    quantity: 3, // Reduced from 5 to 3
    status: 'Sold'
  })
})
// Item quantity automatically decreases by 2

// Option 2: Delete batch (if selling entire batch)
await fetch(`/api/batches/${batchId}`, {
  method: 'DELETE'
})
// Item quantity automatically decreases by batch quantity
```

## Validation & Maintenance

### Validation Script
Check consistency between items and batches:

```bash
# Check for inconsistencies
npm run validate:batches

# Check and automatically fix inconsistencies
npm run validate:batches:fix
```

### Utility Functions

```typescript
import { 
  syncItemQuantityFromBatches,
  validateItemBatchConsistency,
  syncAllBatchSystemItems 
} from '@/lib/utils'

// Sync single item
await syncItemQuantityFromBatches(itemId)

// Validate single item
const result = await validateItemBatchConsistency(itemId)
console.log(result.valid)

// Sync all batch-system items
await syncAllBatchSystemItems()
```

## Migration from Old System

### For Existing Items
1. Items default to `useBatchSystem = true`
2. Old fields (quantityInStock, status, etc.) are preserved for backward compatibility
3. When batches are added, quantityInStock is auto-synced

### Converting Legacy Items to Batch System
```typescript
// 1. Enable batch system
await prisma.item.update({
  where: { id: itemId },
  data: { useBatchSystem: true }
})

// 2. Create initial batch from existing quantity
await prisma.stockBatch.create({
  data: {
    itemId,
    quantity: item.quantityInStock,
    status: item.status,
    costPerUnitUSD: item.costPerUnitUSD,
    locationId: item.locationId
  }
})

// 3. Sync will happen automatically
```

## Best Practices

### ✅ DO
- Create batches for new stock arrivals
- Update batch quantities when selling
- Use batch transfers for moving stock between locations
- Run validation script periodically
- Let the system auto-sync quantities

### ❌ DON'T
- Manually update `item.quantityInStock` for batch-system items
- Mix batch and non-batch operations on the same item
- Forget to await sync functions in custom scripts
- Delete batches without considering stock impact

## Troubleshooting

### Issue: Item quantity doesn't match batch total

**Solution:**
```bash
npm run validate:batches -- --fix
```

### Issue: Sync not happening automatically

**Check:**
1. Item has `useBatchSystem = true`
2. Batch operations use the provided API routes
3. Custom code calls `syncItemQuantityFromBatches()`

### Issue: Database inconsistency

**Recovery:**
```typescript
import { syncAllBatchSystemItems } from '@/lib/utils'
await syncAllBatchSystemItems()
```

## API Reference

### Sync Functions

#### `syncItemQuantityFromBatches(itemId: string)`
Synchronizes item quantity with batch totals
- **Parameters:** itemId (string)
- **Returns:** Promise<Item>
- **Throws:** Error if item not found

#### `validateItemBatchConsistency(itemId: string)`
Validates item-batch consistency
- **Parameters:** itemId (string)
- **Returns:** Promise<ValidationResult>

#### `syncAllBatchSystemItems()`
Syncs all batch-system items
- **Returns:** Promise<Array<SyncResult>>

## Related Files

- `/prisma/schema.prisma` - Database schema
- `/lib/utils.ts` - Sync utility functions
- `/lib/db.ts` - Prisma client configuration
- `/src/app/api/batches/route.ts` - Batch CRUD operations
- `/src/app/api/batches/[id]/route.ts` - Single batch operations
- `/src/app/api/batches/[id]/transfer/route.ts` - Batch transfers
- `/src/app/api/items/route.ts` - Item CRUD operations
- `/src/app/api/items/[id]/route.ts` - Single item operations
- `/scripts/validate-batch-consistency.ts` - Validation script

## Summary

The synchronization system ensures that:
1. ✅ Items and batches always reflect accurate quantities
2. ✅ No manual calculation or updates needed
3. ✅ Multi-location and multi-status tracking works seamlessly
4. ✅ Data integrity is maintained automatically
5. ✅ Easy validation and recovery tools available

All operations that modify batch quantities automatically update the parent item's quantity, providing a single source of truth while maintaining the flexibility of the batch system.
