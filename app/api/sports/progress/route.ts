import { NextRequest, NextResponse } from 'next/server'
import { getProgress } from '@/lib/progress-manager'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      )
    }
    
    const progress = getProgress(sessionId)
    
    if (!progress) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }
    
    const elapsed = Date.now() - progress.start_time
    const estimatedTotal = progress.completed > 0 
      ? (elapsed / progress.completed) * progress.total 
      : 120000 // 2 minutes default
      
    const remainingTime = Math.max(0, estimatedTotal - elapsed)
    
    return NextResponse.json({
      session_id: sessionId,
      progress: {
        total: progress.total,
        completed: progress.completed,
        percentage: Math.round((progress.completed / progress.total) * 100),
        current_task: progress.current_task,
        elapsed_time: elapsed,
        estimated_remaining: remainingTime,
        api_results: progress.api_results,
        errors: progress.errors
      }
    })
    
  } catch (error) {
    console.error('Error getting progress:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

 