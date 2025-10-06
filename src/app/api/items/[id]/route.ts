import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ItemFormSchema } from '@/lib/validations'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    
    const validation = ItemFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid item data', details: validation.error.issues }, { status: 400 })
    }

    const data = validation.data

    // Check if item exists
    const existingItem = await (prisma as any).item.findUnique({
      where: { id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            cashBalanceUSD: true,
          },
        },
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if status is changing from "ToOrder" to "Ordered" - this triggers cash deduction
    if (existingItem.status === 'ToOrder' && data.status === 'Ordered') {
      if (!existingItem.company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      // Calculate total order cost (cost per unit + freight, multiplied by quantity)
      const totalOrderCostUSD = (data.costPerUnitUSD * data.quantityInStock) + data.freightCostUSD

      // Check if company has sufficient USD balance
      if (existingItem.company.cashBalanceUSD < totalOrderCostUSD) {
        return NextResponse.json(
          { 
            error: 'Insufficient funds',
            message: `Company ${existingItem.company.name} has insufficient USD balance. Required: $${totalOrderCostUSD.toFixed(2)}, Available: $${existingItem.company.cashBalanceUSD.toFixed(2)}`,
            required: totalOrderCostUSD,
            available: existingItem.company.cashBalanceUSD,
          },
          { status: 400 }
        )
      }

      // Deduct the cost from company's USD balance
      await (prisma as any).company.update({
        where: { id: existingItem.companyId },
        data: {
          cashBalanceUSD: existingItem.company.cashBalanceUSD - totalOrderCostUSD,
        },
      })
    }

    // Check if status is changing from "Ordered" back to "ToOrder" - this refunds the cash
    if (existingItem.status === 'Ordered' && data.status === 'ToOrder') {
      if (!existingItem.company) {
        return NextResponse.json({ error: 'Company not found' }, { status: 404 })
      }

      // Calculate the refund amount using existing item costs
      const refundAmountUSD = (existingItem.costPerUnitUSD * existingItem.quantityInStock) + existingItem.freightCostUSD

      // Refund the cost to company's USD balance
      await (prisma as any).company.update({
        where: { id: existingItem.companyId },
        data: {
          cashBalanceUSD: existingItem.company.cashBalanceUSD + refundAmountUSD,
        },
      })
    }

    const updatedItem = await (prisma as any).item.update({
      where: { id },
      data,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Check if item exists
    const existingItem = await prisma.item.findUnique({
      where: { id },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    await prisma.item.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting item:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}