import { NextRequest, NextResponse } from 'next/server'

// In-memory storage for progress tracking
const progressStore = new Map<string, {
  total: number
  completed: number
  current_task: string
  start_time: number
  errors: string[]
  api_results: {
    name: string
    status: 'pending' | 'success' | 'error' | 'timeout'
    duration?: number
    error?: string
  }[]
}>()

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
    
    const progress = progressStore.get(sessionId)
    
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

// Helper functions for managing progress
export function createProgressSession(total: number): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  progressStore.set(sessionId, {
    total,
    completed: 0,
    current_task: 'Initializing...',
    start_time: Date.now(),
    errors: [],
    api_results: []
  })
  
  // Auto-cleanup after 5 minutes
  setTimeout(() => {
    progressStore.delete(sessionId)
  }, 300000)
  
  return sessionId
}

export function updateProgress(
  sessionId: string, 
  updates: {
    completed?: number
    current_task?: string
    error?: string
    api_result?: {
      name: string
      status: 'pending' | 'success' | 'error' | 'timeout'
      duration?: number
      error?: string
    }
  }
) {
  const progress = progressStore.get(sessionId)
  if (!progress) return
  
  if (updates.completed !== undefined) {
    progress.completed = updates.completed
  }
  
  if (updates.current_task) {
    progress.current_task = updates.current_task
  }
  
  if (updates.error) {
    progress.errors.push(updates.error)
  }
  
  if (updates.api_result) {
    const existingIndex = progress.api_results.findIndex(
      result => result.name === updates.api_result!.name
    )
    
    if (existingIndex >= 0) {
      progress.api_results[existingIndex] = updates.api_result
    } else {
      progress.api_results.push(updates.api_result)
    }
  }
  
  progressStore.set(sessionId, progress)
} 