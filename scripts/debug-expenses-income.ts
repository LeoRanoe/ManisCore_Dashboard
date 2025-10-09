import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugExpensesAndIncome() {
  try {
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
      }
    })

    console.log('\n=== EXPENSES & INCOME ANALYSIS ===\n')

    for (const company of companies) {
      console.log(`\n📊 Company: ${company.name}`)
      
      const expenses = await prisma.expense.findMany({
        where: { companyId: company.id },
        orderBy: { date: 'desc' }
      })

      let totalExpensesSRD = 0
      let totalExpensesUSD = 0
      let totalIncomeSRD = 0
      let totalIncomeUSD = 0

      console.log(`\n   💸 Expenses & Income (${expenses.length} transactions):`)
      
      for (const exp of expenses) {
        const isIncome = exp.category === 'INCOME'
        const typeIcon = isIncome ? '💰' : '💸'
        const sign = isIncome ? '+' : '-'
        
        console.log(`      ${typeIcon} ${sign}${exp.amount.toFixed(2)} ${exp.currency} - ${exp.description} (${exp.category})`)
        
        if (isIncome) {
          if (exp.currency === 'SRD') {
            totalIncomeSRD += exp.amount
          } else {
            totalIncomeUSD += exp.amount
          }
        } else {
          if (exp.currency === 'SRD') {
            totalExpensesSRD += exp.amount
          } else {
            totalExpensesUSD += exp.amount
          }
        }
      }

      // Convert everything to SRD
      const expensesSRD = totalExpensesSRD + (totalExpensesUSD * 40)
      const incomeSRD = totalIncomeSRD + (totalIncomeUSD * 40)
      const netCashFlowSRD = incomeSRD - expensesSRD

      console.log(`\n   📊 Summary:`)
      console.log(`      Total Expenses: SRD ${totalExpensesSRD.toFixed(2)} + $${totalExpensesUSD.toFixed(2)} USD = SRD ${expensesSRD.toFixed(2)}`)
      console.log(`      Total Income: SRD ${totalIncomeSRD.toFixed(2)} + $${totalIncomeUSD.toFixed(2)} USD = SRD ${incomeSRD.toFixed(2)}`)
      console.log(`      Net Cash Flow: SRD ${netCashFlowSRD.toFixed(2)}`)
      
      console.log(`\n   💵 Current Cash Balance:`)
      console.log(`      SRD: ${company.cashBalanceSRD.toFixed(2)}`)
      console.log(`      USD: $${company.cashBalanceUSD.toFixed(2)} = SRD ${(company.cashBalanceUSD * 40).toFixed(2)}`)
      console.log(`      Total Cash: SRD ${(company.cashBalanceSRD + company.cashBalanceUSD * 40).toFixed(2)}`)
      
      // Check if cash balance matches expected (starting cash + income - expenses)
      // We don't know starting cash, but we can show what cash would be if we added back expenses/income
      console.log(`\n   🔍 Analysis:`)
      console.log(`      If expenses were deducted from cash: Cash should be lower by SRD ${expensesSRD.toFixed(2)}`)
      console.log(`      If income was added to cash: Cash should be higher by SRD ${incomeSRD.toFixed(2)}`)
    }

    console.log('\n=== END ANALYSIS ===\n')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugExpensesAndIncome()
