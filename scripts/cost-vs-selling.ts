import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function compareCostvsSelling() {
  try {
    console.log('\n=== COST vs SELLING PRICE COMPARISON ===\n')

    const items = await prisma.item.findMany({
      where: { companyId: 'cmgfdflsv0001l504de4d00jl' }, // Next X
      include: { batches: true }
    })

    let totalCostUSD = 0
    let totalSellingPriceSRD = 0

    console.log('ITEM ANALYSIS:\n')
    
    for (const item of items) {
      let itemCostUSD = 0
      let itemQty = 0
      
      if (item.useBatchSystem && item.batches.length > 0) {
        for (const batch of item.batches) {
          if (batch.status === 'Arrived') {
            const qty = batch.quantity || 0
            const costPerUnit = batch.costPerUnitUSD || item.costPerUnitUSD || 0
            const freightPerUnit = batch.freightCostUSD / Math.max(qty, 1)
            itemCostUSD += (costPerUnit + freightPerUnit) * qty
            itemQty += qty
          }
        }
      } else if (item.status === 'Arrived') {
        const qty = item.quantityInStock || 0
        const costPerUnit = item.costPerUnitUSD || 0
        const freightPerUnit = (item.freightCostUSD || 0) / Math.max(qty, 1)
        itemCostUSD = (costPerUnit + freightPerUnit) * qty
        itemQty = qty
      }
      
      const itemSellingPriceSRD = (item.sellingPriceSRD || 0) * itemQty
      
      console.log(`${item.name}:`)
      console.log(`  Quantity: ${itemQty} units`)
      console.log(`  Cost (USD): $${itemCostUSD.toFixed(2)} = SRD ${(itemCostUSD * 40).toFixed(2)}`)
      console.log(`  Selling Price per unit: SRD ${(item.sellingPriceSRD || 0).toFixed(2)}`)
      console.log(`  Total Selling Price: SRD ${itemSellingPriceSRD.toFixed(2)}`)
      console.log(`  Potential Profit: SRD ${(itemSellingPriceSRD - (itemCostUSD * 40)).toFixed(2)}`)
      console.log()
      
      totalCostUSD += itemCostUSD
      totalSellingPriceSRD += itemSellingPriceSRD
    }
    
    console.log('═'.repeat(60))
    console.log('TOTALS:')
    console.log(`  Total Cost: $${totalCostUSD.toFixed(2)} = SRD ${(totalCostUSD * 40).toFixed(2)}`)
    console.log(`  Total Selling Price: SRD ${totalSellingPriceSRD.toFixed(2)}`)
    console.log(`  Potential Profit: SRD ${(totalSellingPriceSRD - (totalCostUSD * 40)).toFixed(2)}`)
    console.log('═'.repeat(60))
    console.log()
    
    // Now calculate company worth using selling prices
    const company = await prisma.company.findUnique({
      where: { id: 'cmgfdflsv0001l504de4d00jl' }
    })
    
    if (company) {
      const cashSRD = company.cashBalanceSRD + (company.cashBalanceUSD * 40)
      
      console.log('COMPANY WORTH CALCULATIONS:\n')
      console.log('Option 1 - Using COST BASIS (correct accounting):')
      console.log(`  Cash: SRD ${cashSRD.toFixed(2)}`)
      console.log(`  Stock (at cost): SRD ${(totalCostUSD * 40).toFixed(2)}`)
      console.log(`  TOTAL: SRD ${(cashSRD + (totalCostUSD * 40)).toFixed(2)}`)
      console.log()
      
      console.log('Option 2 - Using SELLING PRICES (if all sold):')
      console.log(`  Cash: SRD ${cashSRD.toFixed(2)}`)
      console.log(`  Stock (at selling price): SRD ${totalSellingPriceSRD.toFixed(2)}`)
      console.log(`  TOTAL: SRD ${(cashSRD + totalSellingPriceSRD).toFixed(2)}`)
      console.log()
      
      console.log('💡 NOTE: Proper accounting uses COST BASIS for inventory value.')
      console.log('   Selling prices are potential revenue, not current worth.')
    }
    
    console.log('\n=== END COMPARISON ===\n')

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

compareCostvsSelling()
