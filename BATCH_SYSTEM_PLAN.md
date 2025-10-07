# 🚀 Inventory System Upgrade: Batch Tracking Implementation Plan

## Executive Summary

You need to upgrade from a simple inventory system to a sophisticated batch tracking system that supports:

✅ **Multiple locations per item** - Same product in different warehouses  
✅ **Multiple statuses per item** - Some units ordered, others in stock  
✅ **Batch-level operations** - Transfer, split, track individual lots  

## Current vs. New System

### Current System (Flat Structure)
```
Item: "KZ Castor Pro"
├── Quantity: 8 units
├── Status: "Arrived" (all units have same status)
├── Location: "Warehouse A" (all units in one place)
└── Cost: $20/unit
```

**Problems:**
- ❌ Can't have 6 units "To Order" AND 2 units "Arrived"
- ❌ Can't store same item in multiple locations
- ❌ Can't track different costs for different batches

### New System (Batch Structure)
```
Item: "KZ Castor Pro" (Base Product)
├── Selling Price: SRD 1400
├── Standard Cost: $20/unit
└── Batches:
    ├── Batch 1: 6 units, "To Order", No Location, $20/unit
    ├── Batch 2: 2 units, "Arrived", Warehouse A, $15/unit
    └── Batch 3: 2 units, "Arrived", Warehouse B, $18/unit
```

**Benefits:**
- ✅ Track multiple statuses simultaneously
- ✅ Store items across multiple locations
- ✅ Track different costs per batch (important for profit calculation)
- ✅ Transfer stock between locations
- ✅ Know exactly which batch to sell from

## Implementation Phases

### Phase 1: Database Migration (30 mins)
**What happens:**
- Create new `StockBatch` table
- Migrate existing items → Each item becomes a batch
- Update foreign key relationships

**Migration command:**
```bash
npx prisma migrate dev --name add_stock_batches
```

**Data transformation example:**
```sql
-- BEFORE: items table
id: "item-1"
name: "KZ Castor Pro"
quantityInStock: 8
status: "Arrived"
locationId: "loc-1"
costPerUnitUSD: 20

-- AFTER: 
items table:
id: "item-1"
name: "KZ Castor Pro"
sellingPriceSRD: 1400
costPerUnitUSD: 20  -- baseline cost

stock_batches table:
id: "batch-1"
itemId: "item-1"
quantity: 8
status: "Arrived"
locationId: "loc-1"
costPerUnitUSD: 20
```

### Phase 2: API Restructuring (2-3 hours)

#### New Batch Endpoints
```typescript
// Create item with initial batch
POST /api/items
{
  name: "KZ Castor Pro",
  sellingPriceSRD: 1400,
  initialBatch: {
    quantity: 10,
    status: "ToOrder",
    costPerUnitUSD: 20
  }
}

// Add batch to existing item
POST /api/items/:itemId/batches
{
  quantity: 5,
  status: "Ordered",
  location: "Warehouse A",
  costPerUnitUSD: 18,
  expectedArrival: "2025-11-15"
}

// Update batch status (e.g., mark as arrived)
PATCH /api/batches/:batchId
{
  status: "Arrived",
  arrivedDate: "2025-10-15",
  locationId: "warehouse-a"
}

// Transfer batch between locations
POST /api/batches/:batchId/transfer
{
  fromLocationId: "warehouse-a",
  toLocationId: "warehouse-b",
  quantity: 3
}

// Get item with all batches
GET /api/items/:itemId?include=batches
{
  id: "item-1",
  name: "KZ Castor Pro",
  totalQuantity: 18,  // Aggregated
  batches: [
    { quantity: 10, status: "Ordered", location: null },
    { quantity: 5, status: "Arrived", location: "Warehouse A" },
    { quantity: 3, status: "Arrived", location: "Warehouse B" }
  ]
}
```

### Phase 3: UI Components (3-4 hours)

#### Updated Item Form
```tsx
<ItemFormDialog>
  {/* Base Item Info */}
  <ItemDetails>
    <Input name="name" label="Product Name" />
    <Input name="sellingPriceSRD" label="Selling Price" />
    <Input name="supplier" label="Supplier" />
  </ItemDetails>

  {/* Batch Information */}
  <BatchSection>
    <h3>Batch Details</h3>
    <Input name="batch.quantity" label="Quantity" />
    <Select name="batch.status" options={["ToOrder", "Ordered", "Arrived"]} />
    <Select name="batch.locationId" label="Location" />
    <Input name="batch.costPerUnitUSD" label="Cost per Unit (USD)" />
    <Input name="batch.freightCostUSD" label="Freight Cost (USD)" />
    
    {batch.status === "Ordered" && (
      <>
        <DatePicker name="batch.orderDate" label="Order Date" />
        <DatePicker name="batch.expectedArrival" label="Expected Arrival" />
        <Input name="batch.orderNumber" label="Order Number" />
      </>
    )}
  </BatchSection>
</ItemFormDialog>
```

#### New Batch Management View
```tsx
<ItemDetailsPage>
  {/* Item Header */}
  <ItemHeader>
    <h1>{item.name}</h1>
    <Badge>Total: {totalQuantity} units</Badge>
    <Button onClick={() => setShowAddBatch(true)}>
      Add New Batch
    </Button>
  </ItemHeader>

  {/* Batches Table */}
  <BatchesTable>
    <BatchRow batch={batch1}>
      <Cell>6 units</Cell>
      <Cell><StatusBadge status="ToOrder" /></Cell>
      <Cell>-</Cell>
      <Cell>$20.00/unit</Cell>
      <Cell>
        <Button onClick={() => editBatch(batch1)}>Edit</Button>
      </Cell>
    </BatchRow>
    
    <BatchRow batch={batch2}>
      <Cell>2 units</Cell>
      <Cell><StatusBadge status="Arrived" /></Cell>
      <Cell>Warehouse A</Cell>
      <Cell>$15.00/unit</Cell>
      <Cell>
        <DropdownMenu>
          <MenuItem onClick={() => transferBatch(batch2)}>Transfer</MenuItem>
          <MenuItem onClick={() => splitBatch(batch2)}>Split</MenuItem>
          <MenuItem onClick={() => updateStatus(batch2)}>Update Status</MenuItem>
        </DropdownMenu>
      </Cell>
    </BatchRow>
  </BatchesTable>

  {/* Aggregated Metrics */}
  <MetricsPanel>
    <Metric label="Total Value" value={totalValue} />
    <Metric label="Total Cost" value={totalCost} />
    <Metric label="Expected Profit" value={profit} />
    <Metric label="Locations" value={uniqueLocations.length} />
  </MetricsPanel>
</ItemDetailsPage>
```

#### Updated Inventory Overview
```tsx
<InventoryOverview>
  {/* Aggregated Status Cards */}
  <StatusCards>
    <Card title="To Order" count={countByStatus.ToOrder} />
    <Card title="Ordered" count={countByStatus.Ordered} />
    <Card title="Arrived" count={countByStatus.Arrived} />
    <Card title="Sold" count={countByStatus.Sold} />
  </StatusCards>

  {/* Items Table with Batch Indicators */}
  <ItemsTable>
    <ItemRow item={item}>
      <Cell>{item.name}</Cell>
      <Cell>
        {/* Multiple status badges */}
        <StatusIndicators>
          {item.hasToOrder && <Badge>6 To Order</Badge>}
          {item.hasArrived && <Badge>2 Arrived</Badge>}
        </StatusIndicators>
      </Cell>
      <Cell>
        {/* Multiple location chips */}
        <LocationChips>
          <Chip>Warehouse A (2)</Chip>
          <Chip>Warehouse B (3)</Chip>
        </LocationChips>
      </Cell>
      <Cell>{item.totalQuantity} units</Cell>
      <Cell>
        <Button onClick={() => viewBatches(item)}>
          View Batches →
        </Button>
      </Cell>
    </ItemRow>
  </ItemsTable>
</InventoryOverview>
```

## Real-World Scenarios

### Scenario 1: Order More of Existing Item
**Current Problem:** Creates duplicate entries

**New Solution:**
```typescript
// User orders 10 more units of existing item
await createBatch({
  itemId: "existing-item-id",
  quantity: 10,
  status: "Ordered",
  costPerUnitUSD: 22,
  expectedArrival: "2025-11-20"
})

// Result: Item now has TWO batches
// Batch 1: 5 units, Arrived, Warehouse A
// Batch 2: 10 units, Ordered, No Location (NEW)
```

### Scenario 2: Receive Ordered Items
```typescript
// When items arrive, update batch status
await updateBatch(batch2Id, {
  status: "Arrived",
  arrivedDate: new Date(),
  locationId: "warehouse-a"
})

// Automatically deducted cash when status was "Ordered"
// Now shows in location: Warehouse A
```

### Scenario 3: Transfer Between Locations
```typescript
// Move 3 units from Warehouse A to Warehouse B
await transferBatch({
  batchId: batch1Id,
  toLocationId: "warehouse-b",
  quantity: 3
})

// Creates new batch at Warehouse B
// Reduces quantity in original batch
// OR splits batch if quantities match
```

### Scenario 4: Sell From Specific Location
```typescript
// Customer buys 2 units from Warehouse A
await sellFromBatch({
  batchId: batch1Id,  // Batch at Warehouse A
  quantity: 2,
  sellingPriceSRD: 1400
})

// Reduces batch quantity by 2
// If quantity reaches 0, mark batch as sold
// Adds profit to company balance
```

## Migration Checklist

### Pre-Migration
- [ ] Backup production database
- [ ] Test migration on development database
- [ ] Document current item count and values
- [ ] Notify team of maintenance window

### Migration Steps
1. [ ] Apply Prisma schema changes
2. [ ] Run migration: `npx prisma migrate deploy`
3. [ ] Verify data migrated correctly
4. [ ] Update API endpoints
5. [ ] Update frontend components
6. [ ] Test batch operations (create, update, transfer)
7. [ ] Deploy to production
8. [ ] Verify inventory totals match pre-migration

### Post-Migration Validation
```sql
-- Verify total quantities match
SELECT 
  i.name,
  SUM(sb.quantity) as total_quantity
FROM items i
LEFT JOIN stock_batches sb ON sb."itemId" = i.id
GROUP BY i.id, i.name
ORDER BY i.name;

-- Check for orphaned batches
SELECT * FROM stock_batches 
WHERE "itemId" NOT IN (SELECT id FROM items);

-- Verify status distribution
SELECT 
  status, 
  COUNT(*) as batch_count,
  SUM(quantity) as total_units
FROM stock_batches
GROUP BY status;
```

## Rollback Plan

If something goes wrong:

```bash
# 1. Revert to previous migration
npx prisma migrate resolve --rolled-back add_stock_batches

# 2. Restore database from backup
# (Use your database provider's restore functionality)

# 3. Revert code changes
git revert HEAD~1
git push
```

## Next Steps

**Ready to proceed?** Here's what I recommend:

1. **Review this plan** - Make sure you understand the changes
2. **Backup database** - Critical step before any migration
3. **Test locally first** - Run migration on development environment
4. **Gradual rollout:**
   - Phase 1: Database migration only
   - Phase 2: API updates (backend still works with old UI)
   - Phase 3: UI updates (final step)

Would you like me to:
- Start with Phase 1 (database migration)?
- Create the new API endpoints first?
- Build a demo of the new UI components?

Let me know how you'd like to proceed! 🚀
