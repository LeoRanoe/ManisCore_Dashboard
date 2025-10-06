import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { ExpenseFormSchema } from '@/lib/validations'
import { z } from 'zod'

// Schema for bulk operations
const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
})

const BulkCreateSchema = z.object({
  expenses: z.array(ExpenseFormSchema).min(1, 'At least one expense is required'),
})

const BulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: ExpenseFormSchema.partial(),
  })).min(1, 'At least one update is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { operation } = body

    switch (operation) {
      case 'create': {
        const validation = BulkCreateSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid bulk create data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        const createdExpenses = await prisma.$transaction(
          validation.data.expenses.map((expense) =>
            prisma.expense.create({ data: expense })
          )
        )

        return NextResponse.json({ 
          success: true, 
          created: createdExpenses.length,
          expenses: createdExpenses 
        }, { status: 201 })
      }

      case 'update': {
        const validation = BulkUpdateSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid bulk update data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        const updatedExpenses = await prisma.$transaction(
          validation.data.updates.map((update) =>
            prisma.expense.update({
              where: { id: update.id },
              data: update.data,
            })
          )
        )

        return NextResponse.json({ 
          success: true, 
          updated: updatedExpenses.length,
          expenses: updatedExpenses 
        })
      }

      case 'delete': {
        const validation = BulkDeleteSchema.safeParse(body)
        if (!validation.success) {
          return NextResponse.json({ 
            error: 'Invalid bulk delete data', 
            details: validation.error.issues 
          }, { status: 400 })
        }

        // Get expenses to delete for logging
        const expensesToDelete = await prisma.expense.findMany({
          where: { id: { in: validation.data.ids } },
          select: { id: true, description: true, amount: true, currency: true },
        })

        if (expensesToDelete.length === 0) {
          return NextResponse.json({ error: 'No expenses found to delete' }, { status: 404 })
        }

        // Delete expenses
        const deletedResult = await prisma.expense.deleteMany({
          where: { id: { in: validation.data.ids } },
        })

        console.log(`Bulk deleted ${deletedResult.count} expenses`)

        return NextResponse.json({ 
          success: true, 
          deleted: deletedResult.count,
          expenses: expensesToDelete
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Must be one of: create, update, delete' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in bulk expenses operation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}