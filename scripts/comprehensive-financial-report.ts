import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function comprehensiveFinancialReport() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('                    COMPREHENSIVE FINANCIAL REPORT')
    console.log('='.repeat(80) + '\n')

    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
      }
    })

    for (const company of companies) {
      console.log(`\n${'─'.repeat(80)}`)
      console.log(`  🏢 COMPANY: ${company.name}`)
      console.log(`${'─'.repeat(80)}\n`)

      // 1. CASH ANALYSIS
      console.log('  💵 CASH ON HAND:')
      console.log(`     SRD: ${company.cashBalanceSRD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      console.log(`     USD: $${company.cashBalanceUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (= SRD ${(company.cashBalanceUSD * 40).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} @ 40:1)`)
      const totalCashSRD = company.cashBalanceSRD + (company.cashBalanceUSD * 40)
      console.log(`     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`     Total Cash: SRD ${totalCashSRD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`)

      // 2. INVENTORY ANALYSIS
      const items = await prisma.item.findMany({
        where: { companyId: company.id },
        include: {
          batches: {
            select: {
              id: true,
              quantity: true,
              costPerUnitUSD: true,
              freightCostUSD: true,
              status: true
            }
          }
        }
      })

      console.log('  📦 INVENTORY VALUE:')
      let totalStockValueUSD = 0
      let totalUnits = 0

      for (const item of items) {
        let itemValue = 0
        let itemQty = 0

        if (item.useBatchSystem && item.batches.length > 0) {
          for (const batch of item.batches) {
            if (batch.status === 'Arrived') {
              const batchQty = batch.quantity || 0
              if (batchQty > 0) {
                const batchCost = batch.costPerUnitUSD || item.costPerUnitUSD || 0
                const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
                const costPerUnit = batchCost + freightPerUnit
                itemValue += costPerUnit * batchQty
                itemQty += batchQty
              }
            }
          }
        } else {
          if (item.status === 'Arrived') {
            const quantity = item.quantityInStock || 0
            if (quantity > 0) {
              const freightCost = item.freightCostUSD || 0
              const freightPerUnit = freightCost / Math.max(quantity, 1)
              const costPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
              itemValue = costPerUnit * quantity
              itemQty = quantity
            }
          }
        }

        if (itemValue > 0) {
          console.log(`     • ${item.name}: ${itemQty} units × $${(itemValue/itemQty).toFixed(2)} = $${itemValue.toFixed(2)}`)
          totalStockValueUSD += itemValue
          totalUnits += itemQty
        }
      }

      const stockValueSRD = totalStockValueUSD * 40
      console.log(`     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`     Total Stock: ${totalUnits} units worth $${totalStockValueUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (= SRD ${stockValueSRD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})\n`)

      // 3. EXPENSES ANALYSIS
      const expenses = await prisma.expense.findMany({
        where: { companyId: company.id },
        orderBy: { date: 'desc' }
      })

      let totalExpensesSRD = 0
      let totalExpensesUSD = 0

      console.log('  💸 EXPENSES:')
      if (expenses.length === 0) {
        console.log('     (No expenses recorded)')
      } else {
        for (const exp of expenses) {
          if (exp.category !== 'INCOME') {
            const symbol = exp.currency === 'SRD' ? 'SRD' : '$'
            console.log(`     • ${exp.description}: -${symbol}${exp.amount.toFixed(2)} (${exp.category})`)
            
            if (exp.currency === 'SRD') {
              totalExpensesSRD += exp.amount
            } else {
              totalExpensesUSD += exp.amount
            }
          }
        }
        const totalExpensesInSRD = totalExpensesSRD + (totalExpensesUSD * 40)
        console.log(`     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
        console.log(`     Total Expenses: SRD ${totalExpensesSRD.toFixed(2)} + $${totalExpensesUSD.toFixed(2)} = SRD ${totalExpensesInSRD.toFixed(2)}`)
      }
      console.log()

      // 4. COMPANY WORTH
      const totalCompanyWorthSRD = totalCashSRD + stockValueSRD
      console.log(`  ${'═'.repeat(76)}`)
      console.log(`  💎 TOTAL COMPANY WORTH:`)
      console.log(`     Cash: SRD ${totalCashSRD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      console.log(`     Stock: SRD ${stockValueSRD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
      console.log(`     ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
      console.log(`     TOTAL: SRD ${totalCompanyWorthSRD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (≈ $${(totalCompanyWorthSRD/40).toFixed(2)} USD)`)
      console.log(`  ${'═'.repeat(76)}\n`)

      // 5. RECONCILIATION
      console.log(`  📊 WHAT YOU SHOULD SEE IN THE APP:`)
      console.log(`     • Total Cash: SRD ${totalCashSRD.toFixed(2)} + USD ${company.cashBalanceUSD.toFixed(2)}`)
      console.log(`     • Total Stock Value: USD ${totalStockValueUSD.toFixed(2)} (SRD ${stockValueSRD.toFixed(2)})`)
      console.log(`     • Company Worth: SRD ${totalCompanyWorthSRD.toFixed(2)}`)
      console.log()
    }

    console.log('='.repeat(80) + '\n')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

comprehensiveFinancialReport()
