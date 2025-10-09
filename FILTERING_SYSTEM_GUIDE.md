# Filtering System Guide

## Overview
The ManisCore Dashboard implements a comprehensive, company-wide filtering system that allows users to view data across all companies or filter by specific companies. This guide explains how the filtering works across the entire application.

## Architecture

### 1. Company Context (`contexts/company-context.tsx`)
- **Global State Management**: Manages the selected company across the entire application
- **Default Value**: `"all"` - shows data from all companies
- **State Updates**: When a company is selected, the context updates and all components automatically refetch their data

### 2. API Endpoints
All API endpoints follow a consistent filtering pattern:

#### Pattern for "All Companies" Handling
```typescript
// Only filter by company if a specific company is selected (not "all")
if (companyId && companyId !== 'all') {
  where.companyId = companyId
}
```

#### Updated Endpoints
- ✅ `/api/users` - Filters users by company, shows all when `companyId="all"`
- ✅ `/api/locations` - Filters locations by company, shows all when `companyId="all"`
- ✅ `/api/items` - Filters items by company, user, and location with "all" support
- ✅ `/api/expenses` - Filters expenses by company, excludes INCOME category by default
- ✅ `/api/batches` - Filters batches by company through item relation
- ✅ `/api/dashboard-metrics` - Aggregates metrics per company when showing all

### 3. Frontend Hooks (`lib/hooks.ts`)
Custom React hooks provide automatic company filtering:

```typescript
// Example: useItems hook
export function useItems(searchQuery = "", statusFilter = "all") {
  const { selectedCompany } = useCompany()
  
  const url = useCallback(() => {
    const params = new URLSearchParams()
    if (searchQuery) params.append('searchQuery', searchQuery)
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
    if (selectedCompany && selectedCompany !== 'all') params.append('companyId', selectedCompany)
    return `/api/items?${params.toString()}`
  }, [searchQuery, statusFilter, selectedCompany])
  
  return useApi<{ items: any[] }>(url, {
    dependencies: [selectedCompany, searchQuery, statusFilter]
  })
}
```

**Available Hooks:**
- `useItems(searchQuery, statusFilter)` - Inventory items
- `useLocations(searchQuery, statusFilter)` - Storage locations
- `useUsers()` - System users
- `useExpenses(searchQuery, statusFilter)` - Business expenses
- `useDashboardMetrics()` - Dashboard metrics

### 4. UI Components

#### Company Selector (in Dashboard Layout)
Located in the sidebar, available on all pages:
```tsx
<Select value={selectedCompany} onValueChange={setSelectedCompany}>
  <SelectTrigger>
    <Building2 className="h-4 w-4 mr-2" />
    <SelectValue placeholder="Select company" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="all">All Companies</SelectItem>
    {companies.map((company) => (
      <SelectItem key={company.id} value={company.id}>
        {company.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
```

## Filtering Behavior by Page

### Dashboard (`/dashboard`)
- **Company Filter**: Shows aggregated data for all companies or specific company
- **User Filter**: Additional filter to show data for specific users
- **Metrics**: 
  - When "All Companies" selected: Shows breakdown by company
  - When specific company selected: Shows detailed metrics for that company only
- **Financial Cards**: Calculates cash, stock value, expenses based on selected filter

### Financial Page (`/financial`)
- **Requires Company Selection**: Shows message if "All Companies" is selected
- **Displays**: Company-specific financial data including:
  - Cash balances (SRD and USD)
  - Stock value at cost
  - Potential revenue
  - Expected profit
  - Recent expenses

### Inventory Pages
#### Items Overview (`/inventory`)
- **Company Filter**: Shows items from all companies or specific company
- **Search**: Filter by item name
- **Status Filter**: Filter by item status (ToOrder, Ordered, Arrived, Sold)

#### Stock Management (`/inventory/stock`)
- **Company Filter**: Applied automatically
- **Batch System**: Shows batches associated with items from selected company

#### Locations (`/inventory/locations`)
- **Company Filter**: Shows locations from all companies or specific company
- **Location Filter**: Filter items by specific location
- **Shows**: Items at each location with batch details

### Users Page (`/users`)
- **Company Filter**: Shows users from all companies or specific company
- **Role Filter**: Filter by user role (ADMIN, MANAGER, STAFF)
- **Status Filter**: Filter by active/inactive status
- **Search**: Filter by name or email

### Locations Page (`/locations`)
- **Company Filter**: Shows locations from all companies or specific company
- **Status Filter**: Filter by active/inactive status
- **Search**: Filter by location name, address, or description

### Expenses Page (`/expenses`)
- **Company Filter**: Shows expenses from all companies or specific company
- **Category Filter**: Filter by expense category
- **Currency Filter**: Filter by SRD or USD
- **Date Range**: Filter by date range
- **Search**: Filter by description or notes
- **Special**: INCOME category is excluded from expense listings by default

### Companies Page (`/companies`)
- **No Company Filter**: Shows all companies (this is the management page)
- **Search**: Filter companies by name

## Data Relationships

### Schema Understanding
```
Company
├── Items (1:many)
│   └── StockBatches (1:many)
├── Users (1:many)
├── Locations (1:many)
└── Expenses (1:many)
```

### Cross-Company Queries
When `companyId="all"`:
- All records across all companies are returned
- Company name is included in each record for display
- Aggregations are calculated per company
- Company-specific metrics are shown in breakdowns

### Single Company Queries
When a specific `companyId` is provided:
- Only records for that company are returned
- Detailed metrics are calculated
- Financial data is specific to selected company

## Best Practices

### For API Development
1. **Always check for "all"**: `if (companyId && companyId !== 'all')`
2. **Include company data**: Always include company info in responses for multi-company views
3. **Calculate aggregations**: Provide per-company breakdowns when showing all companies
4. **Validate access**: Ensure users can only access data they're authorized to see

### For Frontend Development
1. **Use hooks**: Always use the provided hooks (`useItems`, `useLocations`, etc.)
2. **Show context**: Display which company is selected when filtering
3. **Handle "all" state**: Provide appropriate messaging when all companies are selected
4. **Auto-refresh**: Components should automatically refetch when company selection changes

### For Testing
1. **Test "all" companies**: Verify data from all companies appears correctly
2. **Test specific company**: Verify only that company's data appears
3. **Test switching**: Verify data updates when changing company selection
4. **Test permissions**: Verify users can only see authorized data

## Common Patterns

### API Endpoint Pattern
```typescript
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const companyId = searchParams.get('companyId')
  
  const where: any = {}
  
  // Only filter by company if a specific company is selected (not "all")
  if (companyId && companyId !== 'all') {
    where.companyId = companyId
  }
  
  const records = await prisma.model.findMany({
    where,
    include: {
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })
  
  return NextResponse.json({ records })
}
```

### React Component Pattern
```typescript
function MyPage() {
  const { selectedCompany, companies } = useCompany()
  const { data, loading, error, refresh } = useItems()
  
  // Show message if company selection is required
  if (selectedCompany === 'all') {
    return <div>Please select a company to view details</div>
  }
  
  // Display data...
}
```

### Hook Pattern
```typescript
export function useMyData() {
  const { selectedCompany } = useCompany()
  
  const url = useCallback(() => {
    const params = new URLSearchParams()
    if (selectedCompany && selectedCompany !== 'all') {
      params.append('companyId', selectedCompany)
    }
    return `/api/my-endpoint?${params.toString()}`
  }, [selectedCompany])
  
  return useApi<MyDataType>(url, {
    dependencies: [selectedCompany]
  })
}
```

## Troubleshooting

### Filter Not Working
1. Check if API endpoint handles "all" correctly: `if (companyId && companyId !== 'all')`
2. Verify hook includes `selectedCompany` in dependencies
3. Check if component is wrapped with CompanyProvider
4. Verify API endpoint is marked as `export const dynamic = 'force-dynamic'`

### Data Not Updating
1. Check if dependencies array in hooks includes all filters
2. Verify useEffect dependencies in components
3. Check if API endpoint is being cached incorrectly

### Missing Company Information
1. Ensure API includes company relation in Prisma queries
2. Check that company selector is included in company relation
3. Verify company data is being passed to components

## Future Enhancements

### Potential Improvements
1. **Multi-select**: Allow selecting multiple companies at once
2. **Saved Filters**: Allow users to save filter preferences
3. **URL Persistence**: Store selected company in URL for sharing
4. **Performance**: Add pagination and virtualization for large datasets
5. **Caching**: Implement smart caching strategies for better performance
6. **Permissions**: Add role-based access control for company data
7. **Analytics**: Track which filters are most commonly used

## Security Considerations

### Current Implementation
- Frontend filtering only - relies on API endpoints to enforce permissions
- All users can currently see all companies when "All Companies" is selected

### Recommended Additions
1. **User-Company Association**: Limit users to only their assigned companies
2. **Role-Based Access**: ADMIN sees all, MANAGER sees assigned, STAFF sees limited
3. **API Authentication**: Verify user permissions on every API call
4. **Audit Logging**: Track which users access which company data
5. **Data Encryption**: Encrypt sensitive company financial data

## Summary

The filtering system is now consistent across the entire application:
- ✅ All API endpoints handle "all" companies correctly
- ✅ Frontend hooks automatically filter based on selected company
- ✅ UI components show appropriate context for current filter
- ✅ Data relationships are properly maintained
- ✅ Batch system integrates with company filtering
- ✅ Special handling for INCOME vs EXPENSE categories

The system provides a seamless experience for users managing multiple companies while maintaining the ability to focus on specific company data when needed.
