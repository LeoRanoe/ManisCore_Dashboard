# Stock Value Calculation Logic

## Overview
The dashboard calculates stock values based on the **"Arrived"** status to ensure only items that are physically in inventory are counted.

## How It Works

### For Batch System Items (useBatchSystem = true)
- **Only batches with `status = 'Arrived'`** are counted toward stock value
- Each batch tracks its own status independently
- Formula: `Stock Value = SUM(batch.costPerUnitUSD + (batch.freightCostUSD / batch.quantity)) × batch.quantity` for all Arrived batches

### For Legacy System Items (useBatchSystem = false)
- **Only items with `status = 'Arrived'`** are counted toward stock value
- Formula: `Stock Value = (item.costPerUnitUSD + (item.freightCostUSD / item.quantityInStock)) × item.quantityInStock`

## Status Flow

### Item/Batch Status Options
1. **ToOrder** - Not yet ordered (not counted in stock)
2. **Ordered** - Ordered but not received (not counted in stock)
3. **Arrived** - ✅ **Physically in inventory (COUNTED in stock value)**
4. **Sold** - Already sold (not counted in stock)

## Why This Matters

### Financial Accuracy
- **Stock Value** should only reflect what you physically have
- **Potential Revenue** is calculated based on arrived items only
- **Net Worth** = (Cash + Stock Value) - Expenses

### Dashboard Metrics
All these metrics use the "Arrived" status validation:
- Total Stock Value (USD/SRD)
- Potential Revenue (SRD)
- Potential Profit (SRD)
- Company Performance metrics
- User Performance metrics

## To Update Stock Value

### Using Batch System
1. Go to Inventory → Batches
2. Find the batch
3. Change status to **"Arrived"**
4. Stock value will automatically update

### Using Legacy System
1. Go to Inventory → Stock
2. Find the item
3. Change status to **"Arrived"**
4. Stock value will automatically update

## Debug Information

The financial API logs detailed information to help diagnose stock calculation issues:
```
[Financial API] Company {id}:
  - Total items: X
  - Items using batches: X
  - Legacy items: X
  - Total batches: X
  - Arrived batches: X
  - Total arrived batch quantity: X
  - Total stock value USD: $X.XX
```

Check your server logs or Vercel deployment logs to see this information.
