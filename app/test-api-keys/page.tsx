'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export default function TestAPIKeysPage() {
  const [results, setResults] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testAPIKeys = async () => {
    setLoading(true)
    try {
      // Test the sports API with real data
      const response = await fetch('/api/sports/fetch-data?type=results&league=premier-league')
      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  const testRealPostGeneration = async () => {
    setLoading(true)
    try {
      // Test real sports post generation
      const response = await fetch('/api/content/generate-real-sports-post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch-real-data',
          dataType: 'results',
          league: 'premier-league'
        })
      })
      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  const checkAPIKeys = async () => {
    setLoading(true)
    try {
      // Check API keys directly from Supabase
      const response = await fetch('/api/debug/check-api-keys')
      const data = await response.json()
      setResults(data)
    } catch (error) {
      setResults({ error: error instanceof Error ? error.message : 'Unknown error' })
    }
    setLoading(false)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-3xl font-bold mb-8 text-center">
        🔑 בדיקת מפתחות API מסופהבייס
      </h1>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4">בדיקות זמינות:</h2>
          
          <div className="space-y-4">
            <Button 
              onClick={testAPIKeys}
              disabled={loading}
              className="w-full"
            >
              {loading ? '⏳ בודק...' : '🏆 בדיקת נתוני ספורט אמיתיים'}
            </Button>

            <Button 
              onClick={testRealPostGeneration}
              disabled={loading}
              className="w-full"
              variant="outline"
            >
              {loading ? '⏳ בודק...' : '📝 בדיקת יצירת פוסט עם נתונים אמיתיים'}
            </Button>

            <Button 
              onClick={checkAPIKeys}
              disabled={loading}
              className="w-full"
              variant="secondary"
            >
              {loading ? '⏳ בודק...' : '🔍 בדיקת מפתחות API בסופהבייס'}
            </Button>
          </div>
        </div>

        {results && (
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">תוצאות הבדיקה:</h3>
            
            <div className="bg-white rounded p-4 border">
              {results.success ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">✅</span>
                    <span className="font-semibold">הצלחה!</span>
                  </div>
                  
                  <div className="text-sm space-y-2">
                    <p><strong>מקור הנתונים:</strong> {results.source}</p>
                    <p><strong>זמן שליפה:</strong> {results.cached_at}</p>
                    
                    {results.data?.content && (
                      <div>
                        <p><strong>סוג נתונים:</strong> {results.data.type}</p>
                        <p><strong>אזור:</strong> {results.data.region}</p>
                        
                        {results.data.content.recent_results && (
                          <div className="mt-4">
                            <p className="font-semibold">תוצאות אחרונות:</p>
                            <div className="max-h-48 overflow-y-auto">
                              {results.data.content.recent_results.slice(0, 5).map((result: any, index: number) => (
                                <div key={index} className="text-xs bg-gray-100 rounded p-2 mb-1">
                                  {result.home_team} {result.home_score} - {result.away_score} {result.away_team}
                                  <div className="text-gray-500">{result.competition}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500">❌</span>
                    <span className="font-semibold">שגיאה</span>
                  </div>
                  <p className="text-red-600">{results.error}</p>
                </div>
              )}
            </div>

            <details className="mt-4">
              <summary className="cursor-pointer font-semibold">📄 נתונים מלאים</summary>
              <pre className="mt-2 bg-gray-800 text-green-400 p-4 rounded text-xs overflow-auto max-h-96">
                {JSON.stringify(results, null, 2)}
              </pre>
            </details>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3 text-blue-800">
            💡 מה נבדק כאן?
          </h3>
          <ul className="space-y-2 text-blue-700 text-sm">
            <li>• האם המערכת מצליחה לשלוף מפתחות API מסופהבייס</li>
            <li>• האם המפתחות עובדים עם ספקי הנתונים החיצוניים</li>
            <li>• האם המערכת מחזירה נתונים אמיתיים ולא נתוני דמו</li>
            <li>• איכות ועדכניות הנתונים הנשלפים</li>
          </ul>
          
          <div className="mt-4 text-xs text-blue-600">
            <p>🚀 השרת רץ על פורט 3001: <strong>http://localhost:3001</strong></p>
            <p>📡 בודק APIs: Football-Data.org, API-Football, APIFootball, SoccersAPI</p>
          </div>
        </div>
      </div>
    </div>
  )
} 