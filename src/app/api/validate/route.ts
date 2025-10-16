import { NextRequest, NextResponse } from 'next/server'
import { validateAll } from '@/lib/validation-utils'

export const dynamic = 'force-dynamic'

/**
 * GET /api/validate
 * Runs comprehensive data validation checks across the database
 * Returns validation results for all checks
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting comprehensive validation...')
    
    const results = await validateAll()
    
    // Calculate overall status
    const hasErrors = Object.values(results).some(r => r.errors.length > 0)
    const totalErrors = Object.values(results).reduce((sum, r) => sum + r.errors.length, 0)
    const totalWarnings = Object.values(results).reduce((sum, r) => sum + r.warnings.length, 0)
    
    return NextResponse.json({
      status: hasErrors ? 'FAIL' : 'PASS',
      summary: {
        totalErrors,
        totalWarnings,
        checksRun: Object.keys(results).length,
        checksPass: Object.values(results).filter(r => r.valid).length,
        checksFail: Object.values(results).filter(r => !r.valid).length,
      },
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error running validation:', error)
    return NextResponse.json(
      { 
        error: 'Failed to run validation',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
