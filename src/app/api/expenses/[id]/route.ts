import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ExpenseFormSchema } from '@/lib/validations'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const expense = await (prisma as any).expense.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validation = ExpenseFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid expense data', details: validation.error.issues }, { status: 400 })
    }

    const data = validation.data
    
    // Get the existing expense to calculate the difference
    const existingExpense = await (prisma as any).expense.findUnique({
      where: { id: params.id },
      include: {
        company: true
      }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    // Convert date string to Date object if provided
    const expenseData = {
      ...data,
      date: data.date ? new Date(data.date) : existingExpense.date,
    }

    const updatedExpense = await (prisma as any).expense.update({
      where: { id: params.id },
      data: expenseData,
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update company cash balance - revert old amount and apply new amount
    if (existingExpense.company) {
      const company = existingExpense.company
      const updateData: any = {}
      
      // Revert the old expense
      if (existingExpense.currency === 'SRD') {
        updateData.cashBalanceSRD = company.cashBalanceSRD + existingExpense.amount - data.amount
      } else if (existingExpense.currency === 'USD') {
        updateData.cashBalanceUSD = company.cashBalanceUSD + existingExpense.amount - data.amount
      }

      await prisma.company.update({
        where: { id: existingExpense.companyId },
        data: updateData,
      })
    }

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the existing expense to revert the cash balance
    const existingExpense = await (prisma as any).expense.findUnique({
      where: { id: params.id },
      include: {
        company: true
      }
    })

    if (!existingExpense) {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }

    await (prisma as any).expense.delete({
      where: { id: params.id },
    })

    // Revert company cash balance
    if (existingExpense.company) {
      const company = existingExpense.company
      const updateData: any = {}
      
      if (existingExpense.currency === 'SRD') {
        updateData.cashBalanceSRD = company.cashBalanceSRD + existingExpense.amount
      } else if (existingExpense.currency === 'USD') {
        updateData.cashBalanceUSD = company.cashBalanceUSD + existingExpense.amount
      }

      await prisma.company.update({
        where: { id: existingExpense.companyId },
        data: updateData,
      })
    }

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}