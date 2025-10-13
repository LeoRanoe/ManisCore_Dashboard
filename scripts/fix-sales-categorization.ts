/**
 * Fix Sales Categorization
 * 
 * This script updates all expense records that represent sales (INCOME) but were
 * incorrectly categorized as MISCELLANEOUS. It identifies sale records by looking
 * for descriptions that start with "Sale of" and updates them to use the INCOME category.
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixSalesCategorization() {
  console.log('🔍 Finding sales records that are miscategorized...\n')

  try {
    // Find all expense records that are sales but marked as MISCELLANEOUS
    const miscategorizedSales = await prisma.expense.findMany({
      where: {
        category: 'MISCELLANEOUS',
        description: {
          startsWith: 'Sale of'
        }
      },
      include: {
        company: {
          select: {
            name: true
          }
        }
      }
    })

    console.log(`Found ${miscategorizedSales.length} sales records that need to be fixed.\n`)

    if (miscategorizedSales.length === 0) {
      console.log('✅ No records need to be updated. All sales are correctly categorized!')
      return
    }

    // Display the records that will be updated
    console.log('Records to be updated:')
    console.log('─'.repeat(80))
    miscategorizedSales.forEach((sale, index) => {
      console.log(`${index + 1}. ${sale.description}`)
      console.log(`   Amount: ${sale.currency} ${sale.amount.toFixed(2)}`)
      console.log(`   Company: ${sale.company.name}`)
      console.log(`   Date: ${sale.date.toLocaleDateString()}`)
      console.log(`   Current Category: ${sale.category} → Will change to: INCOME`)
      console.log('─'.repeat(80))
    })

    console.log('\n💾 Updating records...\n')

    // Update all miscategorized sales to INCOME category
    const updateResult = await prisma.expense.updateMany({
      where: {
        category: 'MISCELLANEOUS',
        description: {
          startsWith: 'Sale of'
        }
      },
      data: {
        category: 'INCOME'
      }
    })

    console.log(`✅ Successfully updated ${updateResult.count} records from MISCELLANEOUS to INCOME!\n`)

    // Verify the update
    const remainingSales = await prisma.expense.count({
      where: {
        category: 'MISCELLANEOUS',
        description: {
          startsWith: 'Sale of'
        }
      }
    })

    if (remainingSales === 0) {
      console.log('✅ Verification passed: All sales are now correctly categorized as INCOME!')
    } else {
      console.log(`⚠️  Warning: ${remainingSales} sales records are still miscategorized.`)
    }

    // Show summary of income records
    const totalIncomeRecords = await prisma.expense.count({
      where: {
        category: 'INCOME'
      }
    })

    const totalIncomeAmount = await prisma.expense.aggregate({
      where: {
        category: 'INCOME'
      },
      _sum: {
        amount: true
      }
    })

    console.log('\n📊 Income Summary:')
    console.log(`   Total income records: ${totalIncomeRecords}`)
    console.log(`   Total income amount: SRD ${totalIncomeAmount._sum.amount?.toFixed(2) || '0.00'}`)

  } catch (error) {
    console.error('❌ Error updating sales categorization:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixSalesCategorization()
  .then(() => {
    console.log('\n✨ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error)
    process.exit(1)
  })
