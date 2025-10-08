/**
 * Validation Script: Batch-Item Consistency Checker
 * 
 * This script validates that all items using the batch system have
 * their quantityI// Parse command line arguments
const args = process.argv.slice(2)
const fix = args.includes('--fix') || args.includes('-f') || process.env.FIX === 'true'

// Debug: show what arguments were received
console.log('📋 Arguments received:', args)
if (process.env.FIX) {
  console.log('📋 Environment FIX:', process.env.FIX)
}
console.log('🔧 Fix mode:', fix ? 'ENABLED' : 'DISABLED')matching the sum of their batch quantities.
 * It can also fix any inconsistencies found.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  itemId: string
  itemName: string
  itemQuantity: number
  batchTotal: number
  difference: number
  batchCount: number
  isConsistent: boolean
}

async function validateBatchConsistency(fix: boolean = false): Promise<void> {
  console.log('\n🔍 Starting Batch-Item Consistency Validation...\n')
  
  if (fix) {
    console.log('🔧 FIX MODE ENABLED - Inconsistencies will be corrected\n')
  }

  try {
    // Get all items that use the batch system
    const batchSystemItems = await prisma.item.findMany({
      where: { useBatchSystem: true },
      include: {
        batches: {
          select: {
            id: true,
            quantity: true,
            status: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })

    console.log(`📊 Found ${batchSystemItems.length} items using batch system\n`)

    const results: ValidationResult[] = []
    let consistentCount = 0
    let inconsistentCount = 0
    let fixedCount = 0

    // Validate each item
    for (const item of batchSystemItems) {
      const itemQuantity = item.quantityInStock || 0
      const batchTotal = item.batches.reduce((sum, batch) => sum + batch.quantity, 0)
      const difference = batchTotal - itemQuantity
      const isConsistent = difference === 0

      results.push({
        itemId: item.id,
        itemName: item.name,
        itemQuantity,
        batchTotal,
        difference,
        batchCount: item.batches.length,
        isConsistent
      })

      if (isConsistent) {
        consistentCount++
        console.log(`✅ ${item.name}`)
        console.log(`   Item: ${itemQuantity} | Batches: ${batchTotal} | Count: ${item.batches.length}`)
      } else {
        inconsistentCount++
        console.log(`❌ ${item.name}`)
        console.log(`   Item: ${itemQuantity} | Batches: ${batchTotal} | Difference: ${difference}`)
        console.log(`   Batch Count: ${item.batches.length}`)
        
        // Show batch details for inconsistent items
        if (item.batches.length > 0) {
          console.log(`   Batch Details:`)
          item.batches.forEach((batch, idx) => {
            console.log(`     ${idx + 1}. ${batch.quantity} units (${batch.status})`)
          })
        } else {
          console.log(`   No batches found!`)
        }

        // Fix if requested
        if (fix) {
          try {
            console.log(`   🔧 Fixing: Updating item quantity from ${itemQuantity} to ${batchTotal}...`)
            await prisma.item.update({
              where: { id: item.id },
              data: { quantityInStock: batchTotal }
            })
            console.log(`   ✅ Fixed!`)
            fixedCount++
          } catch (error) {
            console.log(`   ❌ Fix failed: ${error}`)
          }
        }
      }
      console.log()
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📈 VALIDATION SUMMARY')
    console.log('='.repeat(60))
    console.log(`Total Items Checked: ${batchSystemItems.length}`)
    console.log(`✅ Consistent: ${consistentCount}`)
    console.log(`❌ Inconsistent: ${inconsistentCount}`)
    
    if (fix && fixedCount > 0) {
      console.log(`🔧 Fixed: ${fixedCount}`)
    }
    
    if (inconsistentCount > 0) {
      console.log('\n⚠️  Issues found!')
      if (!fix) {
        console.log('\n💡 Run with --fix flag to automatically correct inconsistencies:')
        console.log('   npm run validate:batches -- --fix')
      } else {
        console.log(`\n✅ Fixed ${fixedCount} out of ${inconsistentCount} inconsistencies!`)
        if (fixedCount === inconsistentCount) {
          console.log('🎉 All inconsistencies have been corrected!')
        }
      }
    } else {
      console.log('\n🎉 All items are consistent with their batches!')
    }

    // Check for non-batch items
    const nonBatchItems = await prisma.item.count({
      where: { useBatchSystem: false }
    })

    if (nonBatchItems > 0) {
      console.log(`\n📦 Note: ${nonBatchItems} items are not using the batch system`)
    }

  } catch (error) {
    console.error('\n❌ Validation failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Parse command line arguments
const args = process.argv.slice(2)
const fix = args.includes('--fix') || args.includes('-f')

// Debug: show what arguments were received
console.log('� Arguments received:', args)
console.log('🔧 Fix mode:', fix ? 'ENABLED' : 'DISABLED')

// Run validation
validateBatchConsistency(fix)
  .then(() => {
    console.log('\n✅ Validation complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Validation failed:', error)
    process.exit(1)
  })
