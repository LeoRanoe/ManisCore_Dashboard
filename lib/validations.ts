import { z } from 'zod'

export const StatusEnum = z.enum(['ToOrder', 'Ordered', 'Arrived', 'Sold'])

export const ItemFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  status: StatusEnum,
  quantityInStock: z.number().int().min(0, 'Quantity must be non-negative'),
  costPerUnitUSD: z.number().min(0, 'Cost must be non-negative'),
  freightPerUnitUSD: z.number().min(0, 'Freight cost must be non-negative'),
  sellingPriceSRD: z.number().min(0, 'Selling price must be non-negative'),
  companyId: z.string().min(1, 'Company is required'),
})

export const ItemQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(['name', 'status', 'quantityInStock', 'costPerUnitUSD', 'sellingPriceSRD', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  status: StatusEnum.optional(),
  searchQuery: z.string().optional(),
})

export const CompanyFormSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name must be less than 100 characters'),
})

export type ItemFormData = z.infer<typeof ItemFormSchema>
export type ItemQueryData = z.infer<typeof ItemQuerySchema>
export type CompanyFormData = z.infer<typeof CompanyFormSchema>