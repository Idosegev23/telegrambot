'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface CacheStats {
  memory_entries: number
  database_entries: number
  hit_rate: number
  storage_size: string
}

interface APIUsageStats {
  api_name: string
  total_calls: number
  success_rate: number
  avg_response_time: number
  last_called: string
  is_rate_limited: boolean
}

export default function CacheMonitorPage() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null)
  const [apiStats, setApiStats] = useState<APIUsageStats[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)

  const loadCacheStats = async () => {
    setIsLoading(true)
    try {
      // Would need to create this endpoint
      const response = await fetch('/api/sports/cache-stats')
      const data = await response.json()
      
      if (data.success) {
        setCacheStats(data.cache_stats)
        setApiStats(data.api_usage || [])
      }
    } catch (error) {
      console.error('Error loading cache stats:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const clearCache = async () => {
    try {
      const response = await fetch('/api/sports/clear-cache', { method: 'POST' })
      if (response.ok) {
        await loadCacheStats() // Refresh stats
        alert('Cache cleared successfully!')
      }
    } catch (error) {
      console.error('Error clearing cache:', error)
      alert('Error clearing cache')
    }
  }

  useEffect(() => {
    loadCacheStats()
  }, [])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (autoRefresh) {
      interval = setInterval(loadCacheStats, 5000) // Refresh every 5 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh])

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
        <h1 className="text-3xl font-bold">📊 מעקב Cache ו-APIs</h1>
        <p className="text-gray-600">
          מעקב בזמן אמת אחר ביצועי cache ושימוש ב-APIs
        </p>
        
        <div className="flex justify-center gap-4">
          <Button 
            onClick={loadCacheStats} 
            disabled={isLoading}
            className="text-lg px-6 py-2"
          >
            {isLoading ? '🔄 טוען...' : '🔄 רענן נתונים'}
          </Button>
          
          <Button 
            onClick={() => setAutoRefresh(!autoRefresh)}
            variant={autoRefresh ? "destructive" : "default"}
            className="text-lg px-6 py-2"
          >
            {autoRefresh ? '⏸️ עצור רענון אוטומטי' : '▶️ התחל רענון אוטומטי'}
          </Button>
          
          <Button 
            onClick={clearCache}
            variant="outline"
            className="text-lg px-6 py-2"
          >
            🗑️ נקה Cache
          </Button>
        </div>
      </div>

      {/* Cache Statistics */}
      {cacheStats && (
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-bold mb-4 text-center">💾 סטטיסטיקות Cache</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{cacheStats.memory_entries}</div>
              <div className="text-sm text-gray-600">רשומות בזיכרון</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{cacheStats.database_entries}</div>
              <div className="text-sm text-gray-600">רשומות במסד נתונים</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{cacheStats.hit_rate}%</div>
              <div className="text-sm text-gray-600">אחוז פגיעות</div>
            </div>
            <div className="text-center p-4 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{cacheStats.storage_size}</div>
              <div className="text-sm text-gray-600">גודל אחסון</div>
            </div>
          </div>
        </div>
      )}

      {/* API Usage Statistics */}
      {apiStats.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-lg border">
          <h2 className="text-2xl font-bold mb-4">🔧 סטטיסטיקות שימוש ב-APIs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-right p-3 font-bold">API Name</th>
                  <th className="text-right p-3 font-bold">סה״כ קריאות</th>
                  <th className="text-right p-3 font-bold">אחוז הצלחה</th>
                  <th className="text-right p-3 font-bold">זמן ממוצע</th>
                  <th className="text-right p-3 font-bold">קריאה אחרונה</th>
                  <th className="text-right p-3 font-bold">סטטוס</th>
                </tr>
              </thead>
              <tbody>
                {apiStats.map((api, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-medium">{api.api_name}</td>
                    <td className="p-3">{api.total_calls.toLocaleString()}</td>
                    <td className="p-3">
                      <span className={`font-bold ${
                        api.success_rate >= 80 ? 'text-green-600' : 
                        api.success_rate >= 60 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {api.success_rate}%
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={
                        api.avg_response_time < 2000 ? 'text-green-600 font-bold' : 
                        api.avg_response_time < 10000 ? 'text-yellow-600' : 'text-red-600'
                      }>
                        {api.avg_response_time.toLocaleString()}ms
                      </span>
                    </td>
                    <td className="p-3 text-xs">
                      {new Date(api.last_called).toLocaleString('he-IL')}
                    </td>
                    <td className="p-3">
                      {api.is_rate_limited ? (
                        <span className="px-2 py-1 rounded-full text-xs font-bold text-red-600 bg-red-100">
                          🚫 Rate Limited
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-bold text-green-600 bg-green-100">
                          ✅ פעיל
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cache Performance Insights */}
      <div className="bg-white p-6 rounded-lg shadow-lg border">
        <h2 className="text-2xl font-bold mb-4">💡 תובנות ביצועים</h2>
        <div className="space-y-3">
          <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
            <h3 className="font-bold text-blue-800">🚀 אופטימיזציה חכמה</h3>
            <p className="text-blue-700">
              Cache חכם על בסיס סוג הנתונים: נתונים חיים (30 שניות), תוצאות היסטוריות (שעה), מידע על קבוצות (24 שעות)
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border-l-4 border-green-400">
            <h3 className="font-bold text-green-800">⚡ ביצועים מהירים</h3>
            <p className="text-green-700">
              Cache בזיכרון לגישה מהירה + cache מתמיד במסד נתונים לגיבוי
            </p>
          </div>
          
          <div className="p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
            <h3 className="font-bold text-yellow-800">🛡️ הגנה מפני Rate Limiting</h3>
            <p className="text-yellow-700">
              מעקב אחר שימוש ב-APIs ומניעה אוטומטית של קריאות מיותרות
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border-l-4 border-purple-400">
            <h3 className="font-bold text-purple-800">🔄 ניקוי אוטומטי</h3>
            <p className="text-purple-700">
              Cache מנקה את עצמו כל שעה, מחיקת נתונים ישנים באופן אוטומטי
            </p>
          </div>
        </div>
      </div>

      {/* Live Monitoring Status */}
      {autoRefresh && (
        <div className="fixed bottom-4 right-4 bg-green-500 text-white p-3 rounded-lg shadow-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
            <span className="font-bold">מעקב חי פעיל</span>
          </div>
        </div>
      )}
    </div>
  )
} 