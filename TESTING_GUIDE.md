# Testing Guide: Inventory Actions with Batch System

## Overview
This guide helps you test the fixed inventory actions (sell, add, remove) to ensure they work correctly with the batch system.

## Prerequisites
- Application deployed to: https://manis-core-dashboard-3cjnnn0p7-leoranoes-projects.vercel.app
- Admin access to the dashboard
- At least one item with `useBatchSystem = true` (default for all new items)

## Test Scenarios

### 1. Test SELL Operation

#### Setup
1. Go to Inventory → Items
2. Find an item with available stock (quantityInStock > 0)
3. Note the current quantity (e.g., 150)

#### Test Steps
1. Click "Sell" on the item
2. Enter quantity to sell (e.g., 20)
3. Enter sale price and reason
4. Click "Confirm"

#### Expected Results
- ✅ Success message appears
- ✅ Item quantity decreases by sold amount (150 → 130)
- ✅ Sale record appears in expenses with negative amount (revenue)
- ✅ Oldest batches are reduced first (FIFO)
- ✅ Empty batches are automatically deleted
- ✅ Company cash balance increases by sale amount

#### Verification
```sql
-- Check batches were reduced correctly
SELECT * FROM StockBatch WHERE itemId = 'your-item-id' ORDER BY createdAt ASC;

-- Check item quantity matches sum of batches
SELECT 
  i.quantityInStock,
  SUM(b.quantity) as batchTotal
FROM Item i
LEFT JOIN StockBatch b ON b.itemId = i.id
WHERE i.id = 'your-item-id';
```

### 2. Test ADD Operation

#### Setup
1. Go to Inventory → Items
2. Find an item with `useBatchSystem = true`
3. Note the current quantity (e.g., 130)

#### Test Steps
1. Click "Add Stock" on the item
2. Enter quantity to add (e.g., 50)
3. Enter reason: "Stock replenishment"
4. Click "Confirm"

#### Expected Results
- ✅ Success message appears
- ✅ Item quantity increases by added amount (130 → 180)
- ✅ New batch is created with:
  - quantity = 50
  - status = 'Arrived'
  - notes = "Stock replenishment"
  - costPerUnitUSD from item
- ✅ Item's quantityInStock updates immediately

#### Verification
```sql
-- Check new batch was created
SELECT * FROM StockBatch 
WHERE itemId = 'your-item-id' 
ORDER BY createdAt DESC 
LIMIT 1;

-- Verify quantity
SELECT quantityInStock FROM Item WHERE id = 'your-item-id';
```

### 3. Test REMOVE Operation

#### Setup
1. Go to Inventory → Items
2. Find an item with available stock
3. Note the current quantity (e.g., 180)

#### Test Steps
1. Click "Remove" on the item
2. Enter quantity to remove (e.g., 30)
3. Enter reason: "Damaged goods"
4. Click "Confirm"

#### Expected Results
- ✅ Success message appears
- ✅ Item quantity decreases by removed amount (180 → 150)
- ✅ Oldest batches are reduced first (FIFO)
- ✅ Empty batches are automatically deleted
- ✅ Cost is allocated to profit (cash balance increases)
- ✅ Expense record created with negative amount (profit allocation)

#### Verification
```sql
-- Check batches were reduced
SELECT * FROM StockBatch WHERE itemId = 'your-item-id' ORDER BY createdAt ASC;

-- Check expense record
SELECT * FROM Expense 
WHERE description LIKE '%Stock removal%' 
ORDER BY createdAt DESC 
LIMIT 1;
```

### 4. Test FIFO (First In First Out) Logic

#### Setup
Create an item with multiple batches:
1. Add item with initial quantity (creates batch 1)
2. Wait 1 minute
3. Add more stock (creates batch 2)
4. Wait 1 minute
5. Add more stock (creates batch 3)

Example batches:
- Batch 1 (oldest): 50 units, created 3 minutes ago
- Batch 2 (middle): 75 units, created 2 minutes ago
- Batch 3 (newest): 25 units, created 1 minute ago
- **Total**: 150 units

#### Test Steps
1. Sell 100 units from this item
2. Check which batches were affected

#### Expected Results
- ✅ Batch 1 completely removed (50 units sold)
- ✅ Batch 2 partially reduced (50 units sold, 25 units remaining)
- ✅ Batch 3 untouched (25 units remaining)
- ✅ Item quantity: 50 (25 + 25)

#### Verification
```sql
-- Check remaining batches
SELECT 
  id,
  quantity,
  createdAt,
  TIMESTAMPDIFF(MINUTE, createdAt, NOW()) as age_minutes
FROM StockBatch 
WHERE itemId = 'your-item-id' 
ORDER BY createdAt ASC;

-- Should show:
-- Batch 2: 25 units remaining
-- Batch 3: 25 units remaining
```

### 5. Test Edge Cases

#### Test 5.1: Sell Exact Stock
1. Item has 50 units
2. Sell exactly 50 units
3. Expected: All batches deleted, item quantity = 0

#### Test 5.2: Insufficient Stock
1. Item has 50 units
2. Try to sell 60 units
3. Expected: Error message "Insufficient stock"

#### Test 5.3: Multiple Small Batches
1. Create item with 5 batches of 10 units each
2. Sell 35 units
3. Expected: First 3 batches deleted, 4th batch has 5 units remaining

#### Test 5.4: Legacy Items (useBatchSystem = false)
1. Find or create item with `useBatchSystem = false`
2. Sell/add/remove stock
3. Expected: Direct quantityInStock update (old behavior)

## Validation Commands

### Check Consistency
Run the validation script to ensure all items are consistent:

```bash
# Check for inconsistencies
npm run validate:batches

# Auto-fix any inconsistencies found
npm run validate:batches:fix
```

### Expected Output (All Good)
```
Checking batch system consistency...
✓ All 4 items with batch system are consistent
```

### If Inconsistencies Found
```
Checking batch system consistency...
Found 2 inconsistencies:

Item: Widget A (id: abc123)
  - Item quantityInStock: 150
  - Sum of batches: 145
  - Difference: 5

Run with --fix flag to automatically correct inconsistencies.
```

Then run:
```bash
npm run validate:batches:fix
```

## API Testing (Advanced)

### Using curl or Postman

#### Sell Item
```bash
curl -X POST https://your-domain.vercel.app/api/inventory/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "sell",
    "itemId": "your-item-id",
    "quantityToSell": 20,
    "salePriceSRD": 1000,
    "reason": "Customer purchase"
  }'
```

#### Add Stock
```bash
curl -X POST https://your-domain.vercel.app/api/inventory/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "add",
    "itemId": "your-item-id",
    "quantityToAdd": 50,
    "reason": "Stock replenishment"
  }'
```

#### Remove Stock
```bash
curl -X POST https://your-domain.vercel.app/api/inventory/actions \
  -H "Content-Type: application/json" \
  -d '{
    "action": "remove",
    "itemId": "your-item-id",
    "quantityToRemove": 10,
    "reason": "Damaged goods"
  }'
```

## Troubleshooting

### Issue: Quantity doesn't update
1. Check if item has `useBatchSystem = true`
2. Run validation script: `npm run validate:batches:fix`
3. Check Vercel logs for errors
4. Verify batches exist for the item

### Issue: "No available batches" error
1. Check if item has batches: `SELECT * FROM StockBatch WHERE itemId = 'id'`
2. If no batches, manually create one or use "Add Stock" first
3. Run sync: `npm run validate:batches:fix`

### Issue: Quantities don't match
1. Run validation: `npm run validate:batches`
2. Auto-fix: `npm run validate:batches:fix`
3. Check if multiple processes are updating stock simultaneously

## Success Criteria

✅ All test scenarios pass  
✅ FIFO logic works correctly  
✅ Edge cases handled properly  
✅ Validation script shows no inconsistencies  
✅ No errors in Vercel logs  
✅ Item quantities always match sum of batches  

## Next Steps

1. Test in production with real data
2. Monitor for any errors over next 24 hours
3. Train users on new system behavior
4. Update documentation if needed
5. Consider adding batch selection UI for more control

## Related Documentation

- `INVENTORY_ACTIONS_FIX.md`: Technical details of the fix
- `IMPLEMENTATION_COMPLETE.md`: Original batch system implementation
- `BATCH_SYSTEM_PLAN.md`: Original planning document
- `prisma/schema.prisma`: Database schema

## Support

If issues persist:
1. Check Vercel deployment logs
2. Run validation script with --fix flag
3. Review recent commits in Git
4. Contact development team with error details
