'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface APIResult {
  name: string
  url: string
  status: 'success' | 'failed' | 'error'
  duration: number
  timeout: boolean
  response_size: number
  error: string | null
  rate_limit_info: {
    remaining: string | null
    limit: string | null
    reset: string | null
  } | null
}

interface PerformanceSummary {
  total_apis_tested: number
  successful: number
  failed: number
  timed_out: number
  average_response_time: number
  fastest_api: string
  slowest_api: string
  total_test_time: number
}

export default function TestAPIPerformancePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<APIResult[]>([])
  const [summary, setSummary] = useState<PerformanceSummary | null>(null)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [currentTask, setCurrentTask] = useState('')

  const runPerformanceTest = async () => {
    setIsLoading(true)
    setResults([])
    setSummary(null)
    setProgress({ current: 0, total: 0 })
    setCurrentTask('מתחיל בדיקת ביצועים...')

    try {
      const response = await fetch('/api/sports/test-performance')
      const data = await response.json()

      if (data.success) {
        setResults(data.results)
        setSummary(data.summary)
        setCurrentTask('בדיקה הושלמה בהצלחה!')
      } else {
        console.error('Performance test failed:', data.error)
        setCurrentTask(`שגיאה: ${data.error}`)
      }
    } catch (error) {
      console.error('Error running performance test:', error)
      setCurrentTask('שגיאה בחיבור לשרת')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100'
      case 'failed': return 'text-yellow-600 bg-yellow-100'
      case 'error': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6" dir="rtl">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">🏃‍♂️ בדיקת ביצועי Sports APIs</h1>
        <p className="text-gray-600">
          בדיקה מקיפה של ביצועי כל ה-APIs עם הגבלת זמן של 30 שניות לכל קריאה
        </p>
        
        <Button 
          onClick={runPerformanceTest} 
          disabled={isLoading}
          className="text-lg px-8 py-3"
        >
          {isLoading ? '🔄 בודק ביצועים...' : '🚀 התחל בדיקת ביצועים'}
        </Button>
      </div>

      {/* Current Task */}
      {currentTask && (
        <div className="text-center p-4 bg-blue-50 rounded-lg border">
          <p className="text-blue-800 font-medium">{currentTask}</p>
        </div>
      )}

      {/* Performance Summary */}
      {summary && (
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-bold mb-4 text-center">📊 סיכום ביצועים</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{summary.total_apis_tested}</div>
              <div className="text-sm text-gray-600">סה״כ APIs</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{summary.successful}</div>
              <div className="text-sm text-gray-600">הצליחו</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{summary.failed + summary.timed_out}</div>
              <div className="text-sm text-gray-600">נכשלו</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{summary.average_response_time}ms</div>
              <div className="text-sm text-gray-600">זמן ממוצע</div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="font-bold text-green-700">🥇 הכי מהיר</div>
              <div>{summary.fastest_api}</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="font-bold text-orange-700">🐌 הכי איטי</div>
              <div>{summary.slowest_api}</div>
            </div>
          </div>
          
          <div className="mt-4 text-center p-3 bg-gray-50 rounded-lg">
            <div className="font-bold">⏱️ זמן בדיקה כולל: {(summary.total_test_time / 1000).toFixed(1)} שניות</div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {results.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-bold mb-4">📈 תוצאות מפורטות</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right p-3 font-bold">API Name</th>
                  <th className="text-right p-3 font-bold">סטטוס</th>
                  <th className="text-right p-3 font-bold">זמן תגובה</th>
                  <th className="text-right p-3 font-bold">גודל תגובה</th>
                  <th className="text-right p-3 font-bold">Rate Limit</th>
                  <th className="text-right p-3 font-bold">שגיאה</th>
                </tr>
              </thead>
              <tbody>
                {results.map((result, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{result.name}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(result.status)}`}>
                        {result.status === 'success' ? '✅ הצלחה' : 
                         result.status === 'failed' ? '⚠️ נכשל' : '❌ שגיאה'}
                      </span>
                      {result.timeout && (
                        <span className="mr-2 px-2 py-1 rounded-full text-xs font-bold text-red-600 bg-red-100">
                          ⏰ Timeout
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={result.duration < 5000 ? 'text-green-600 font-bold' : 
                                     result.duration < 15000 ? 'text-yellow-600' : 'text-red-600'}>
                        {result.duration.toLocaleString()}ms
                      </span>
                    </td>
                    <td className="p-3">{formatBytes(result.response_size)}</td>
                    <td className="p-3">
                      {result.rate_limit_info?.remaining ? (
                        <div className="text-xs">
                          <div>נותר: {result.rate_limit_info.remaining}</div>
                          {result.rate_limit_info.limit && (
                            <div>מגבלה: {result.rate_limit_info.limit}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">לא זמין</span>
                      )}
                    </td>
                    <td className="p-3">
                      {result.error ? (
                        <span className="text-red-600 text-xs">{result.error}</span>
                      ) : (
                        <span className="text-green-600">✅</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
        <h3 className="text-lg font-bold text-blue-800 mb-3">💡 טיפים לשיפור ביצועים</h3>
        <ul className="space-y-2 text-blue-700">
          <li>• APIs עם זמן תגובה מתחת ל-5 שניות נחשבים מהירים</li>
          <li>• APIs עם זמן תגובה מעל 15 שניות עלולים לגרום לאיטיות</li>
          <li>• בדוק את מגבלות ה-Rate Limit כדי למנוע חסימות</li>
          <li>• השתמש ב-caching לנתונים שמתעדכנים לאט (כמו standings)</li>
          <li>• שקול להשתמש במקביליות (parallel calls) עבור APIs מהירים</li>
        </ul>
      </div>
    </div>
  )
} 