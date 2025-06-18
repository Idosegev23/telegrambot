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

export function getProgress(sessionId: string) {
  return progressStore.get(sessionId)
} 