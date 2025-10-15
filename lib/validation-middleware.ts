import { NextRequest, NextResponse } from 'next/server'
import { prisma } from './db'

/**
 * Validates that batch operations maintain data integrity
 * This middleware should be called before batch create/update/delete operations
 */
export async function validateBatchOperation(
  operation: 'create' | 'update' | 'delete',
  batchData: {
    id?: string
    itemId: string
    quantity?: number
    locationId?: string | null
    status?: string
  }
) {
  const errors: string[] = []

  // Validate item exists
  const item = await prisma.item.findUnique({
    where: { id: batchData.itemId },
    include: { company: true }
  })

  if (!item) {
    errors.push(`Item with ID ${batchData.itemId} not found`)
    return { valid: false, errors, item: null }
  }

  // Validate item uses batch system
  if (!item.useBatchSystem) {
    errors.push(`Item "${item.name}" does not use the batch system`)
    return { valid: false, errors, item }
  }

  // Validate quantity
  if (operation !== 'delete' && batchData.quantity !== undefined) {
    if (batchData.quantity < 0) {
      errors.push('Quantity cannot be negative')
    }
  }

  // Validate location exists if provided
  if (batchData.locationId) {
    const location = await prisma.location.findUnique({
      where: { id: batchData.locationId }
    })

    if (!location) {
      errors.push(`Location with ID ${batchData.locationId} not found`)
    } else if (location.companyId !== item.companyId) {
      errors.push(`Location "${location.name}" does not belong to the same company as item "${item.name}"`)
    }
  }

  // For updates, validate batch exists
  if (operation === 'update' || operation === 'delete') {
    if (!batchData.id) {
      errors.push('Batch ID is required for update/delete operations')
    } else {
      const batch = await prisma.stockBatch.findUnique({
        where: { id: batchData.id }
      })

      if (!batch) {
        errors.push(`Batch with ID ${batchData.id} not found`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    item
  }
}

/**
 * Validates that item operations maintain data integrity with batches
 */
export async function validateItemOperation(
  operation: 'create' | 'update' | 'delete',
  itemData: {
    id?: string
    locationId?: string | null
    companyId?: string
  }
) {
  const errors: string[] = []

  // For updates/deletes, validate item exists
  if ((operation === 'update' || operation === 'delete') && itemData.id) {
    const item = await prisma.item.findUnique({
      where: { id: itemData.id },
      include: { batches: true }
    })

    if (!item) {
      errors.push(`Item with ID ${itemData.id} not found`)
      return { valid: false, errors, item: null }
    }

    // Validate location change doesn't conflict with batches
    if (operation === 'update' && itemData.locationId && item.useBatchSystem) {
      const batchesWithDifferentLocation = item.batches.filter(
        b => b.locationId && b.locationId !== itemData.locationId
      )

      if (batchesWithDifferentLocation.length > 0) {
        console.warn(
          `Warning: Item has ${batchesWithDifferentLocation.length} batches in different locations. ` +
          'Consider updating batch locations first.'
        )
      }
    }

    return { valid: errors.length === 0, errors, item }
  }

  // Validate company exists for create operations
  if (operation === 'create' && itemData.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: itemData.companyId }
    })

    if (!company) {
      errors.push(`Company with ID ${itemData.companyId} not found`)
    }
  }

  // Validate location exists and belongs to company
  if (itemData.locationId && itemData.companyId) {
    const location = await prisma.location.findUnique({
      where: { id: itemData.locationId }
    })

    if (!location) {
      errors.push(`Location with ID ${itemData.locationId} not found`)
    } else if (location.companyId !== itemData.companyId) {
      errors.push('Location does not belong to the specified company')
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    item: null
  }
}
