import { z } from 'zod'

export const StatusEnum = z.enum(['ToOrder', 'Ordered', 'Arrived', 'Sold'])
export const UserRoleEnum = z.enum(['ADMIN', 'MANAGER', 'STAFF'])
export const ExpenseCategoryEnum = z.enum(['DINNER', 'OFFICE_SUPPLIES', 'MARKETING', 'TRANSPORTATION', 'UTILITIES', 'RENT', 'MAINTENANCE', 'MISCELLANEOUS'])
export const CurrencyEnum = z.enum(['SRD', 'USD'])

export const ItemFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  status: StatusEnum,
  quantityInStock: z.number().int().min(0, 'Quantity must be non-negative'),
  costPerUnitUSD: z.number().min(0, 'Cost must be non-negative'),
  freightCostUSD: z.number().min(0, 'Freight cost must be non-negative'),
  sellingPriceSRD: z.number().min(0, 'Selling price must be non-negative'),
  supplier: z.string().optional().nullable(),
  supplierSku: z.string().optional().nullable(),
  orderDate: z.string().optional().nullable(),
  expectedArrival: z.string().optional().nullable(),
  orderNumber: z.string().optional().nullable(),
  profitMarginPercent: z.number().min(0).max(100).optional().nullable(),
  minStockLevel: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
  companyId: z.string().min(1, 'Company is required'),
  assignedUserId: z.string().optional().nullable(),
  locationId: z.string().optional().nullable(),
})

export const ItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'status', 'quantityInStock', 'costPerUnitUSD', 'sellingPriceSRD', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: StatusEnum.optional(),
  searchQuery: z.string().optional(),
  companyId: z.string().optional(),
  assignedUserId: z.string().optional(),
  locationId: z.string().optional(),
})

export const CompanyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name must be less than 100 characters'),
})

export const CompanyFinancialUpdateSchema = z.object({
  cashBalanceSRD: z.number().min(0, 'Cash balance must be non-negative'),
  cashBalanceUSD: z.number().min(0, 'Cash balance must be non-negative'),
  stockValueSRD: z.number().min(0, 'Stock value must be non-negative'),
  stockValueUSD: z.number().min(0, 'Stock value must be non-negative'),
})

export const UserFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  role: UserRoleEnum,
  isActive: z.boolean(),
  companyId: z.string().optional().nullable(),
})

export const LocationFormSchema = z.object({
  name: z.string().min(1, 'Location name is required').max(100, 'Location name must be less than 100 characters'),
  address: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  companyId: z.string().min(1, 'Company is required'),
  managerId: z.string().optional(),
})

export const ExpenseFormSchema = z.object({
  description: z.string().min(1, 'Description is required').max(200, 'Description must be less than 200 characters'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  currency: CurrencyEnum,
  category: ExpenseCategoryEnum,
  date: z.string().datetime().optional(),
  notes: z.string().optional(),
  companyId: z.string().min(1, 'Company is required'),
  createdById: z.string().optional(),
})

export const ExpenseQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['date', 'amount', 'category', 'createdAt']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  category: ExpenseCategoryEnum.optional(),
  currency: CurrencyEnum.optional(),
  searchQuery: z.string().optional(),
  companyId: z.string().optional(),
  createdById: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
})

export type ItemFormData = z.infer<typeof ItemFormSchema>
export type ItemQueryData = z.infer<typeof ItemQuerySchema>
export type CompanyFormData = z.infer<typeof CompanyFormSchema>
export type CompanyFinancialUpdateData = z.infer<typeof CompanyFinancialUpdateSchema>
export type UserFormData = z.infer<typeof UserFormSchema>
export type LocationFormData = z.infer<typeof LocationFormSchema>
export type ExpenseFormData = z.infer<typeof ExpenseFormSchema>
export type ExpenseQueryData = z.infer<typeof ExpenseQuerySchema>