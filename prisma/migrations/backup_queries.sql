-- ============================================
-- PRE-MIGRATION BACKUP VERIFICATION
-- Run these queries to document current state
-- ============================================

-- 1. Count all items
SELECT COUNT(*) as total_items FROM items;

-- 2. Total quantities
SELECT SUM("quantityInStock") as total_quantity FROM items;

-- 3. Items by status
SELECT 
  status,
  COUNT(*) as item_count,
  SUM("quantityInStock") as total_units
FROM items
GROUP BY status;

-- 4. Items by location
SELECT 
  l.name as location_name,
  COUNT(i.id) as item_count,
  SUM(i."quantityInStock") as total_units
FROM items i
LEFT JOIN locations l ON l.id = i."locationId"
GROUP BY l.name;

-- 5. Total value
SELECT 
  SUM("quantityInStock" * "sellingPriceSRD") as total_value_srd
FROM items;

-- 6. Export all items (for CSV backup)
SELECT 
  i.id,
  i.name,
  i.status,
  i."quantityInStock",
  i."costPerUnitUSD",
  i."freightCostUSD",
  i."sellingPriceSRD",
  i.supplier,
  i."supplierSku",
  i."orderDate",
  i."expectedArrival",
  i."orderNumber",
  i.notes,
  c.name as company_name,
  l.name as location_name,
  u.name as assigned_user_name
FROM items i
JOIN companies c ON c.id = i."companyId"
LEFT JOIN locations l ON l.id = i."locationId"
LEFT JOIN users u ON u.id = i."assignedUserId"
ORDER BY i.name;
