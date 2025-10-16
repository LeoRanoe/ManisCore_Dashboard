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

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Update the expense
      const updatedExpense = await (tx as any).expense.update({
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
      // Handle currency changes properly by reverting in old currency and deducting in new currency
      if (existingExpense.company) {
        const company = existingExpense.company
        
        // Revert the old expense from its original currency
        if (existingExpense.currency === 'SRD') {
          await (tx as any).company.update({
            where: { id: existingExpense.companyId },
            data: {
              cashBalanceSRD: company.cashBalanceSRD + existingExpense.amount
            }
          })
        } else if (existingExpense.currency === 'USD') {
          await (tx as any).company.update({
            where: { id: existingExpense.companyId },
            data: {
              cashBalanceUSD: company.cashBalanceUSD + existingExpense.amount
            }
          })
        }

        // Get updated company balance for the new currency deduction
        const updatedCompany = await (tx as any).company.findUnique({
          where: { id: existingExpense.companyId }
        })

        if (updatedCompany) {
          // Deduct the new expense in the new currency
          if (data.currency === 'SRD') {
            await (tx as any).company.update({
              where: { id: existingExpense.companyId },
              data: {
                cashBalanceSRD: updatedCompany.cashBalanceSRD - data.amount
              }
            })
          } else if (data.currency === 'USD') {
            await (tx as any).company.update({
              where: { id: existingExpense.companyId },
              data: {
                cashBalanceUSD: updatedCompany.cashBalanceUSD - data.amount
              }
            })
          }
        }
      }

      return updatedExpense
    })

    return NextResponse.json(result)
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

    // Use transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Delete the expense
      await (tx as any).expense.delete({
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

        await (tx as any).company.update({
          where: { id: existingExpense.companyId },
          data: updateData,
        })
      }
    })

    return NextResponse.json({ message: 'Expense deleted successfully' })
  } catch (error) {
    console.error('Error deleting expense:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}