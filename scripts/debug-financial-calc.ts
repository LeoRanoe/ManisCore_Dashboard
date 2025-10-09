import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function debugFinancialCalculations() {
  try {
    // Get all companies
    const companies = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        cashBalanceSRD: true,
        cashBalanceUSD: true,
      }
    })

    console.log('\n=== COMPANY FINANCIAL DEBUG ===\n')

    for (const company of companies) {
      console.log(`\n📊 Company: ${company.name}`)
      console.log(`   Cash Balance SRD: ${company.cashBalanceSRD.toFixed(2)}`)
      console.log(`   Cash Balance USD: ${company.cashBalanceUSD.toFixed(2)}`)

      // Get all items for this company
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

      console.log(`\n   📦 Items: ${items.length}`)

      let totalStockValueUSD = 0
      let batchCount = 0
      let legacyCount = 0
      let arrivedBatchCount = 0
      let arrivedLegacyCount = 0

      for (const item of items) {
        let itemValue = 0
        let itemQty = 0

        if (item.useBatchSystem && item.batches.length > 0) {
          batchCount++
          console.log(`\n   🔸 ${item.name} (Batch System)`)
          
          for (const batch of item.batches) {
            console.log(`      Batch ${batch.id.slice(-6)}: status=${batch.status}, qty=${batch.quantity}, costPerUnit=${batch.costPerUnitUSD}, freight=${batch.freightCostUSD}`)
            
            if (batch.status === 'Arrived') {
              arrivedBatchCount++
              const batchQty = batch.quantity || 0
              if (batchQty > 0) {
                const batchCost = batch.costPerUnitUSD || item.costPerUnitUSD || 0
                const freightPerUnit = batch.freightCostUSD / Math.max(batchQty, 1)
                const costPerUnit = batchCost + freightPerUnit
                const batchValue = costPerUnit * batchQty
                itemValue += batchValue
                itemQty += batchQty
                console.log(`         ✅ ARRIVED: ${batchQty} units × $${costPerUnit.toFixed(2)} = $${batchValue.toFixed(2)}`)
              }
            }
          }
        } else {
          legacyCount++
          console.log(`\n   🔸 ${item.name} (Legacy System)`)
          console.log(`      Status: ${item.status}, Qty in stock: ${item.quantityInStock}, Cost per unit: ${item.costPerUnitUSD}, Freight: ${item.freightCostUSD}`)
          
          if (item.status === 'Arrived') {
            arrivedLegacyCount++
            const quantity = item.quantityInStock || 0
            if (quantity > 0) {
              const freightCost = item.freightCostUSD || 0
              const freightPerUnit = freightCost / Math.max(quantity, 1)
              const costPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
              itemValue = costPerUnit * quantity
              itemQty = quantity
              console.log(`      ✅ ARRIVED: ${quantity} units × $${costPerUnit.toFixed(2)} = $${itemValue.toFixed(2)}`)
            }
          }
        }

        if (itemValue > 0) {
          console.log(`      💰 Item Total: $${itemValue.toFixed(2)} (${itemQty} units)`)
          totalStockValueUSD += itemValue
        }
      }

      const stockValueSRD = totalStockValueUSD * 40
      const totalValueSRD = company.cashBalanceSRD + (company.cashBalanceUSD * 40) + stockValueSRD

      console.log(`\n   📈 Summary:`)
      console.log(`      - Batch system items: ${batchCount} (${arrivedBatchCount} arrived batches)`)
      console.log(`      - Legacy system items: ${legacyCount} (${arrivedLegacyCount} arrived)`)
      console.log(`      - Total Stock Value: $${totalStockValueUSD.toFixed(2)} USD = SRD ${stockValueSRD.toFixed(2)}`)
      console.log(`      - Cash in SRD: SRD ${company.cashBalanceSRD.toFixed(2)}`)
      console.log(`      - Cash in USD: $${company.cashBalanceUSD.toFixed(2)} = SRD ${(company.cashBalanceUSD * 40).toFixed(2)}`)
      console.log(`      - 💎 TOTAL COMPANY WORTH: SRD ${totalValueSRD.toFixed(2)} (${(totalValueSRD / 40).toFixed(2)} USD)`)
    }

    console.log('\n=== END DEBUG ===\n')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

debugFinancialCalculations()
