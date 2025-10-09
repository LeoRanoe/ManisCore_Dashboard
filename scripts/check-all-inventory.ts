import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkAllInventory() {
  try {
    console.log('\n=== ALL INVENTORY ITEMS (INCLUDING NON-ARRIVED) ===\n')

    const companies = await prisma.company.findMany({
      select: { id: true, name: true }
    })

    for (const company of companies) {
      const items = await prisma.item.findMany({
        where: { companyId: company.id },
        include: {
          batches: true
        }
      })

      if (items.length === 0) continue

      console.log(`\n📊 Company: ${company.name}\n`)

      let totalValueAllStatuses = 0

      for (const item of items) {
        console.log(`\n   🔸 ${item.name}`)
        console.log(`      Item Status: ${item.status}`)
        console.log(`      Use Batch System: ${item.useBatchSystem}`)
        console.log(`      Cost per unit: $${(item.costPerUnitUSD || 0).toFixed(2)}`)
        console.log(`      Selling price: SRD ${(item.sellingPriceSRD || 0).toFixed(2)}`)

        if (item.useBatchSystem && item.batches.length > 0) {
          console.log(`      Batches:`)
          let itemTotal = 0
          for (const batch of item.batches) {
            const costPerUnit = batch.costPerUnitUSD || item.costPerUnitUSD || 0
            const freightPerUnit = batch.freightCostUSD / Math.max(batch.quantity, 1)
            const totalCostPerUnit = costPerUnit + freightPerUnit
            const batchValue = totalCostPerUnit * batch.quantity
            
            console.log(`         - Batch ${batch.id.slice(-6)}: ${batch.quantity} units, status=${batch.status}, cost=$${totalCostPerUnit.toFixed(2)}, value=$${batchValue.toFixed(2)}`)
            
            itemTotal += batchValue
            if (batch.status === 'Arrived') {
              totalValueAllStatuses += batchValue
            }
          }
          console.log(`      Total value (all batches): $${itemTotal.toFixed(2)}`)
        } else {
          const qty = item.quantityInStock || 0
          const freightPerUnit = (item.freightCostUSD || 0) / Math.max(qty, 1)
          const totalCostPerUnit = (item.costPerUnitUSD || 0) + freightPerUnit
          const itemValue = totalCostPerUnit * qty
          console.log(`      Quantity in stock: ${qty}`)
          console.log(`      Total value: $${itemValue.toFixed(2)}`)
          
          if (item.status === 'Arrived') {
            totalValueAllStatuses += itemValue
          }
        }
      }

      console.log(`\n   💰 Total value of ARRIVED items: $${totalValueAllStatuses.toFixed(2)} (SRD ${(totalValueAllStatuses * 40).toFixed(2)})`)
    }

    console.log('\n=== END ===\n')
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkAllInventory()
