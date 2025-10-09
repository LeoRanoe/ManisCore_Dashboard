import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function detailedFinancialAudit() {
  try {
    console.log('\n' + '='.repeat(80))
    console.log('                    DETAILED FINANCIAL AUDIT')
    console.log('='.repeat(80) + '\n')

    // Get all companies
    const companies = await prisma.company.findMany()
    
    console.log('📋 COMPANIES IN DATABASE:')
    for (const company of companies) {
      console.log(`   • ${company.name} (ID: ${company.id})`)
    }
    console.log()

    // Get all items with full details
    const items = await prisma.item.findMany({
      include: {
        company: true,
        batches: true
      }
    })

    console.log(`📦 TOTAL ITEMS IN DATABASE: ${items.length}\n`)

    // Analyze by company
    for (const company of companies) {
      console.log(`\n${'═'.repeat(80)}`)
      console.log(`  🏢 ${company.name}`)
      console.log(`${'═'.repeat(80)}\n`)

      const companyItems = items.filter(i => i.companyId === company.id)
      
      console.log(`  💵 STORED CASH BALANCES:`)
      console.log(`     SRD: ${company.cashBalanceSRD.toFixed(2)}`)
      console.log(`     USD: $${company.cashBalanceUSD.toFixed(2)}`)
      console.log(`     Total Cash in SRD: ${(company.cashBalanceSRD + company.cashBalanceUSD * 40).toFixed(2)}`)
      console.log()

      console.log(`  📊 STORED STOCK VALUES (from company table):`)
      console.log(`     Stock Value SRD: ${company.stockValueSRD.toFixed(2)}`)
      console.log(`     Stock Value USD: $${company.stockValueUSD.toFixed(2)}`)
      console.log(`     ⚠️  NOTE: These stored values might be outdated!`)
      console.log()

      // Calculate actual stock value from items
      let calculatedStockUSD = 0
      let totalUnits = 0
      
      console.log(`  📦 INVENTORY ITEMS (${companyItems.length} items):`)
      
      for (const item of companyItems) {
        let itemValue = 0
        let itemQty = 0
        
        console.log(`\n     ╔════════════════════════════════════════════════════════════════╗`)
        console.log(`     ║ ${item.name.padEnd(62)} ║`)
        console.log(`     ╚════════════════════════════════════════════════════════════════╝`)
        console.log(`     Item ID: ${item.id}`)
        console.log(`     Status: ${item.status}`)
        console.log(`     Use Batch System: ${item.useBatchSystem}`)
        console.log(`     Cost Per Unit USD: $${(item.costPerUnitUSD || 0).toFixed(2)}`)
        console.log(`     Freight Cost USD: $${(item.freightCostUSD || 0).toFixed(2)}`)
        console.log(`     Selling Price SRD: ${(item.sellingPriceSRD || 0).toFixed(2)}`)
        console.log(`     Quantity in Stock (legacy): ${item.quantityInStock || 0}`)
        
        if (item.useBatchSystem && item.batches.length > 0) {
          console.log(`\n     📦 BATCHES (${item.batches.length}):`)
          for (const batch of item.batches) {
            const batchQty = batch.quantity || 0
            const batchCostPerUnit = batch.costPerUnitUSD || item.costPerUnitUSD || 0
            const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
            const totalCostPerUnit = batchCostPerUnit + freightPerUnit
            const batchValue = totalCostPerUnit * batchQty
            
            console.log(`        • Batch ${batch.id.slice(-8)}:`)
            console.log(`          Status: ${batch.status}`)
            console.log(`          Quantity: ${batchQty}`)
            console.log(`          Cost Per Unit: $${batchCostPerUnit.toFixed(2)}`)
            console.log(`          Freight: $${batch.freightCostUSD.toFixed(2)} ($${freightPerUnit.toFixed(2)}/unit)`)
            console.log(`          Total Cost/Unit: $${totalCostPerUnit.toFixed(2)}`)
            console.log(`          Batch Value: $${batchValue.toFixed(2)}`)
            
            if (batch.status === 'Arrived') {
              console.log(`          ✅ COUNTED in stock value`)
              itemValue += batchValue
              itemQty += batchQty
            } else {
              console.log(`          ⏳ NOT counted (status: ${batch.status})`)
            }
          }
        } else {
          console.log(`\n     📊 LEGACY SYSTEM (no batches):`)
          const qty = item.quantityInStock || 0
          const costPerUnit = item.costPerUnitUSD || 0
          const freightPerUnit = (item.freightCostUSD || 0) / Math.max(qty, 1)
          const totalCostPerUnit = costPerUnit + freightPerUnit
          const value = totalCostPerUnit * qty
          
          console.log(`        Quantity: ${qty}`)
          console.log(`        Cost Per Unit: $${costPerUnit.toFixed(2)}`)
          console.log(`        Freight: $${(item.freightCostUSD || 0).toFixed(2)} ($${freightPerUnit.toFixed(2)}/unit)`)
          console.log(`        Total Cost/Unit: $${totalCostPerUnit.toFixed(2)}`)
          console.log(`        Total Value: $${value.toFixed(2)}`)
          
          if (item.status === 'Arrived') {
            console.log(`        ✅ COUNTED in stock value`)
            itemValue = value
            itemQty = qty
          } else {
            console.log(`        ⏳ NOT counted (status: ${item.status})`)
          }
        }
        
        if (itemValue > 0) {
          console.log(`\n     💰 ITEM TOTAL: $${itemValue.toFixed(2)} (${itemQty} units)`)
          calculatedStockUSD += itemValue
          totalUnits += itemQty
        } else {
          console.log(`\n     ⚠️  ITEM NOT INCLUDED in calculations (not arrived or zero value)`)
        }
      }
      
      const calculatedStockSRD = calculatedStockUSD * 40
      
      console.log(`\n  ${'─'.repeat(76)}`)
      console.log(`  📊 CALCULATED INVENTORY VALUE:`)
      console.log(`     Total Units: ${totalUnits}`)
      console.log(`     Total Value: $${calculatedStockUSD.toFixed(2)} USD`)
      console.log(`     Total Value: SRD ${calculatedStockSRD.toFixed(2)}`)
      console.log()
      
      const totalCashSRD = company.cashBalanceSRD + (company.cashBalanceUSD * 40)
      const totalWorthSRD = totalCashSRD + calculatedStockSRD
      
      console.log(`  ${'═'.repeat(76)}`)
      console.log(`  💎 COMPANY WORTH BREAKDOWN:`)
      console.log(`     Cash (SRD): ${company.cashBalanceSRD.toFixed(2)}`)
      console.log(`     Cash (USD): $${company.cashBalanceUSD.toFixed(2)} = SRD ${(company.cashBalanceUSD * 40).toFixed(2)}`)
      console.log(`     Total Cash: SRD ${totalCashSRD.toFixed(2)}`)
      console.log(`     Stock Value: SRD ${calculatedStockSRD.toFixed(2)}`)
      console.log(`     ─────────────────────────────────────────────────`)
      console.log(`     TOTAL WORTH: SRD ${totalWorthSRD.toFixed(2)} ($${(totalWorthSRD/40).toFixed(2)})`)
      console.log(`  ${'═'.repeat(76)}`)
    }

    // Check if there are any transactions/expenses that might affect the calculation
    console.log(`\n\n${'═'.repeat(80)}`)
    console.log(`  💸 EXPENSES/INCOME ANALYSIS`)
    console.log(`${'═'.repeat(80)}\n`)

    const expenses = await prisma.expense.findMany({
      include: {
        company: true
      }
    })

    console.log(`Total Expense/Income Records: ${expenses.length}`)
    
    if (expenses.length > 0) {
      for (const exp of expenses) {
        const symbol = exp.currency === 'SRD' ? 'SRD' : '$'
        const type = exp.category === 'INCOME' ? '💰 INCOME' : '💸 EXPENSE'
        console.log(`   ${type}: ${symbol}${exp.amount.toFixed(2)} - ${exp.description} (${exp.company.name})`)
      }
    }

    console.log('\n' + '='.repeat(80))
    console.log('                    END AUDIT')
    console.log('='.repeat(80) + '\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

detailedFinancialAudit()
