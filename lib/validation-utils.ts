/**
 * Database Validation Utilities
 * Helper functions to validate data integrity across the application
 */

import { prisma } from './db'

interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  info: Record<string, any>
}

/**
 * Validates that all items using batch system have correct quantities
 */
export async function validateItemBatchConsistency(): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const info: Record<string, any> = {}

  try {
    // Get all items using batch system
    const items = await prisma.item.findMany({
      where: { useBatchSystem: true },
      include: {
        batches: {
          select: { id: true, quantity: true }
        }
      }
    })

    info.totalBatchItems = items.length
    let inconsistentCount = 0

    for (const item of items) {
      const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
      const itemQuantity = item.quantityInStock || 0

      if (batchTotal !== itemQuantity) {
        inconsistentCount++
        errors.push(
          `Item "${item.name}" (${item.id}): quantity mismatch. Item shows ${itemQuantity}, batches total ${batchTotal}`
        )
      }
    }

    info.inconsistentItems = inconsistentCount
    info.consistentItems = items.length - inconsistentCount

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      info
    }
  }
}

/**
 * Validates company cash balances are non-negative
 */
export async function validateCompanyCashBalances(): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const info: Record<string, any> = {}

  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
      }
    })

    info.totalCompanies = companies.length
    let negativeBalanceCount = 0

    for (const company of companies) {
      if (company.cashBalanceSRD < 0) {
        negativeBalanceCount++
        errors.push(
          `Company "${company.name}" has negative SRD balance: ${company.cashBalanceSRD}`
        )
      }
      if (company.cashBalanceUSD < 0) {
        negativeBalanceCount++
        errors.push(
          `Company "${company.name}" has negative USD balance: ${company.cashBalanceUSD}`
        )
      }
    }

    info.companiesWithNegativeBalance = negativeBalanceCount
    info.companiesWithPositiveBalance = companies.length - negativeBalanceCount

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      info
    }
  }
}

/**
 * Validates that all items have valid company references
 */
export async function validateItemCompanyReferences(): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const info: Record<string, any> = {}

  try {
    // Get all items
    const items = await prisma.item.findMany({
      select: {
        id: true,
        name: true,
        companyId: true,
      }
    })

    // Get all valid company IDs
    const companies = await prisma.company.findMany({
      select: { id: true }
    })
    const validCompanyIds = new Set(companies.map(c => c.id))

    info.totalItems = items.length
    let orphanedCount = 0

    for (const item of items) {
      if (!validCompanyIds.has(item.companyId)) {
        orphanedCount++
        errors.push(
          `Item "${item.name}" (${item.id}) references non-existent company: ${item.companyId}`
        )
      }
    }

    info.orphanedItems = orphanedCount
    info.validItems = items.length - orphanedCount

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      info
    }
  }
}

/**
 * Validates that locations don't have orphaned items
 */
export async function validateLocationReferences(): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const info: Record<string, any> = {}

  try {
    // Get all items with location references
    const itemsWithLocations = await prisma.item.findMany({
      where: {
        locationId: { not: null }
      },
      select: {
        id: true,
        name: true,
        locationId: true,
      }
    })

    // Get all batches with location references
    const batchesWithLocations = await prisma.stockBatch.findMany({
      where: {
        locationId: { not: null }
      },
      select: {
        id: true,
        locationId: true,
      }
    })

    // Get all valid location IDs
    const locations = await prisma.location.findMany({
      select: { id: true }
    })
    const validLocationIds = new Set(locations.map(l => l.id))

    info.totalItems = itemsWithLocations.length
    info.totalBatches = batchesWithLocations.length
    let orphanedItemCount = 0
    let orphanedBatchCount = 0

    for (const item of itemsWithLocations) {
      if (item.locationId && !validLocationIds.has(item.locationId)) {
        orphanedItemCount++
        errors.push(
          `Item "${item.name}" (${item.id}) references non-existent location: ${item.locationId}`
        )
      }
    }

    for (const batch of batchesWithLocations) {
      if (batch.locationId && !validLocationIds.has(batch.locationId)) {
        orphanedBatchCount++
        errors.push(
          `Batch ${batch.id} references non-existent location: ${batch.locationId}`
        )
      }
    }

    info.orphanedItems = orphanedItemCount
    info.orphanedBatches = orphanedBatchCount
    info.validReferences = itemsWithLocations.length + batchesWithLocations.length - orphanedItemCount - orphanedBatchCount

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      info
    }
  }
}

/**
 * Validates that categories don't have circular references
 */
export async function validateCategoryHierarchy(): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []
  const info: Record<string, any> = {}

  try {
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        parentId: true,
      }
    })

    info.totalCategories = categories.length

    // Build a map of category relationships
    const categoryMap = new Map(categories.map(c => [c.id, c]))

    // Check for circular references
    let circularCount = 0
    for (const category of categories) {
      if (!category.parentId) continue

      const visited = new Set<string>([category.id])
      let currentId: string | null = category.parentId

      while (currentId) {
        if (visited.has(currentId)) {
          circularCount++
          errors.push(
            `Category "${category.name}" (${category.id}) has circular reference in hierarchy`
          )
          break
        }

        visited.add(currentId)
        const parent = categoryMap.get(currentId)
        currentId = parent?.parentId || null
      }
    }

    info.circularReferences = circularCount
    info.validHierarchies = categories.length - circularCount

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      info
    }
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to validate: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings,
      info
    }
  }
}

/**
 * Run all validation checks
 */
export async function validateAll(): Promise<Record<string, ValidationResult>> {
  console.log('🔍 Running comprehensive data validation...\n')

  const results = {
    itemBatchConsistency: await validateItemBatchConsistency(),
    companyCashBalances: await validateCompanyCashBalances(),
    itemCompanyReferences: await validateItemCompanyReferences(),
    locationReferences: await validateLocationReferences(),
    categoryHierarchy: await validateCategoryHierarchy(),
  }

  // Print summary
  console.log('📊 Validation Summary:')
  console.log('='.repeat(60))

  let totalErrors = 0
  let totalWarnings = 0

  for (const [check, result] of Object.entries(results)) {
    const status = result.valid ? '✅' : '❌'
    console.log(`${status} ${check}`)
    console.log(`   Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`)
    
    if (result.info) {
      console.log(`   Info: ${JSON.stringify(result.info)}`)
    }

    totalErrors += result.errors.length
    totalWarnings += result.warnings.length

    if (result.errors.length > 0) {
      result.errors.forEach(error => console.log(`      ❌ ${error}`))
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`      ⚠️  ${warning}`))
    }
    console.log()
  }

  console.log('='.repeat(60))
  console.log(`Total Errors: ${totalErrors}`)
  console.log(`Total Warnings: ${totalWarnings}`)
  console.log(`Overall Status: ${totalErrors === 0 ? '✅ PASS' : '❌ FAIL'}`)

  return results
}
