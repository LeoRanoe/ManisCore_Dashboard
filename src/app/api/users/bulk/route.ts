import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { UserFormSchema } from '@/lib/validations'
import { z } from 'zod'

// Schema for bulk operations
const BulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1, 'At least one ID is required'),
})

const BulkCreateSchema = z.object({
  users: z.array(UserFormSchema).min(1, 'At least one user is required'),
})

const BulkUpdateSchema = z.object({
  updates: z.array(z.object({
    id: z.string(),
    data: UserFormSchema.partial(),
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

        const createdUsers = await prisma.$transaction(
          validation.data.users.map((user) =>
            prisma.user.create({ data: user })
          )
        )

        return NextResponse.json({ 
          success: true, 
          created: createdUsers.length,
          users: createdUsers 
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

        const updatedUsers = await prisma.$transaction(
          validation.data.updates.map((update) =>
            prisma.user.update({
              where: { id: update.id },
              data: update.data,
            })
          )
        )

        return NextResponse.json({ 
          success: true, 
          updated: updatedUsers.length,
          users: updatedUsers 
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

        // Get users to delete for logging
        const usersToDelete = await prisma.user.findMany({
          where: { id: { in: validation.data.ids } },
          select: { id: true, name: true, email: true },
        })

        if (usersToDelete.length === 0) {
          return NextResponse.json({ error: 'No users found to delete' }, { status: 404 })
        }

        // Delete users
        const deletedResult = await prisma.user.deleteMany({
          where: { id: { in: validation.data.ids } },
        })

        console.log(`Bulk deleted ${deletedResult.count} users`)

        return NextResponse.json({ 
          success: true, 
          deleted: deletedResult.count,
          users: usersToDelete
        })
      }

      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Must be one of: create, update, delete' 
        }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in bulk users operation:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'One or more user emails already exist' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}