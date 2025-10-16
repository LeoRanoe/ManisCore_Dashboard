import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { CompanyFormSchema } from '@/lib/validations'

export async function GET() {
  try {
    const companies = await prisma.company.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        _count: {
          select: {
            items: true,
            users: true,
            locations: true,
            expenses: true,
          },
        },
      },
    })

    return NextResponse.json(companies)
  } catch (error) {
    console.error('Error fetching companies:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper function to generate slug from name
function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = CompanyFormSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json({ error: 'Invalid company data', details: validation.error.issues }, { status: 400 })
    }

    // Process the data to handle JSON fields properly
    const processedData: any = { ...validation.data }
    
    // Auto-generate slug if not provided or empty
    if (!processedData.slug || processedData.slug.trim() === '') {
      processedData.slug = generateSlug(processedData.name)
    }
    
    // Handle socialMedia: convert null to undefined, empty object to undefined
    if (processedData.socialMedia === null || 
        (processedData.socialMedia && Object.keys(processedData.socialMedia).length === 0)) {
      processedData.socialMedia = undefined
    }
    
    // Handle themeConfig: convert null to undefined, empty object to undefined
    if (processedData.themeConfig === null || 
        (processedData.themeConfig && Object.keys(processedData.themeConfig).length === 0)) {
      processedData.themeConfig = undefined
    }

    const company = await prisma.company.create({
      data: processedData,
    })

    return NextResponse.json(company, { status: 201 })
  } catch (error) {
    console.error('Error creating company:', error)
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: 'Company name or slug already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}