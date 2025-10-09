// Verify the dashboard calculation fix

console.log('=== DASHBOARD CALCULATION VERIFICATION ===\n')

// Based on our database data:
const nextX = {
  name: 'Next X',
  cashBalanceSRD: 3900.00,
  cashBalanceUSD: 177.66,
  stockValueSRD: 5820.00,  // Already converted from $145.50 * 40
  stockValueUSD: 145.50
}

const bijouAyu = {
  name: 'Bijoux Ayu',
  cashBalanceSRD: 0,
  cashBalanceUSD: 50.00,
  stockValueSRD: 0,
  stockValueUSD: 0
}

// Aggregate totals (what dashboard calculates)
const totalCashSRD = nextX.cashBalanceSRD + bijouAyu.cashBalanceSRD
const totalCashUSD = nextX.cashBalanceUSD + bijouAyu.cashBalanceUSD
const totalStockValueSRD = nextX.stockValueSRD + bijouAyu.stockValueSRD
const totalStockValueUSD = nextX.stockValueUSD + bijouAyu.stockValueUSD

console.log('Aggregated Totals:')
console.log(`  Total Cash SRD: ${totalCashSRD.toFixed(2)}`)
console.log(`  Total Cash USD: ${totalCashUSD.toFixed(2)}`)
console.log(`  Total Stock SRD: ${totalStockValueSRD.toFixed(2)}`)
console.log(`  Total Stock USD: ${totalStockValueUSD.toFixed(2)}`)
console.log()

// OLD (WRONG) CALCULATION - double counting stock
const oldCalculation = 
  (totalCashSRD + totalStockValueSRD) + 
  ((totalCashUSD + totalStockValueUSD) * 40)

console.log('❌ OLD (WRONG) CALCULATION:')
console.log(`   = (${totalCashSRD} + ${totalStockValueSRD}) + ((${totalCashUSD} + ${totalStockValueUSD}) * 40)`)
console.log(`   = ${totalCashSRD + totalStockValueSRD} + ${(totalCashUSD + totalStockValueUSD) * 40}`)
console.log(`   = SRD ${oldCalculation.toFixed(2)}`)
console.log(`   ⚠️  This double-counts stock value!`)
console.log()

// NEW (CORRECT) CALCULATION
const newCalculation = 
  totalCashSRD + (totalCashUSD * 40) + totalStockValueSRD

console.log('✅ NEW (CORRECT) CALCULATION:')
console.log(`   = ${totalCashSRD} + (${totalCashUSD} * 40) + ${totalStockValueSRD}`)
console.log(`   = ${totalCashSRD} + ${totalCashUSD * 40} + ${totalStockValueSRD}`)
console.log(`   = SRD ${newCalculation.toFixed(2)}`)
console.log()

// Breakdown by company
console.log('BREAKDOWN BY COMPANY:')
console.log()
console.log(`Next X:`)
console.log(`  Cash: SRD ${nextX.cashBalanceSRD} + $${nextX.cashBalanceUSD} (${nextX.cashBalanceUSD * 40} SRD) = ${nextX.cashBalanceSRD + (nextX.cashBalanceUSD * 40)} SRD`)
console.log(`  Stock: SRD ${nextX.stockValueSRD}`)
console.log(`  Total: SRD ${(nextX.cashBalanceSRD + (nextX.cashBalanceUSD * 40) + nextX.stockValueSRD).toFixed(2)}`)
console.log()
console.log(`Bijoux Ayu:`)
console.log(`  Cash: SRD ${bijouAyu.cashBalanceSRD} + $${bijouAyu.cashBalanceUSD} (${bijouAyu.cashBalanceUSD * 40} SRD) = ${bijouAyu.cashBalanceSRD + (bijouAyu.cashBalanceUSD * 40)} SRD`)
console.log(`  Stock: SRD ${bijouAyu.stockValueSRD}`)
console.log(`  Total: SRD ${(bijouAyu.cashBalanceSRD + (bijouAyu.cashBalanceUSD * 40) + bijouAyu.stockValueSRD).toFixed(2)}`)
console.log()

const totalWorth = newCalculation
console.log(`💎 GRAND TOTAL (All Companies): SRD ${totalWorth.toFixed(2)}`)
console.log()

// Excluding Bijoux Ayu as user requested
const excludingBijoux = newCalculation - (bijouAyu.cashBalanceSRD + (bijouAyu.cashBalanceUSD * 40) + bijouAyu.stockValueSRD)
console.log(`📊 Excluding Bijoux Ayu: SRD ${excludingBijoux.toFixed(2)}`)
console.log()

console.log('=== END VERIFICATION ===')
