'use client'

import { useState } from 'react'

export default function TestChartsPage() {
  const [chartUrl, setChartUrl] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const testChart = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/content/generate-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chartType: 'bar',
          chartData: {
            labels: ['Liverpool', 'Manchester United'],
            datasets: [{
              label: 'Goals',
              data: [3, 1],
              backgroundColor: ['#3b82f6', '#ef4444']
            }]
          },
          title: 'Test Chart - Goals',
          width: 600,
          height: 400
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      setChartUrl(result.data.chartUrl)
      console.log('Test result:', result)
      
    } catch (err: any) {
      setError(err.message)
      console.error('Test error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Chart Generation Test</h1>
        
        <div className="bg-white rounded-lg shadow-lg p-6">
          <button
            onClick={testChart}
            disabled={loading}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Generating Chart...' : 'Test Chart Generation'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Error:</strong> {error}
            </div>
          )}

          {chartUrl && (
            <div className="mt-6">
              <h2 className="text-xl font-semibold mb-4">Generated Chart:</h2>
              <div className="bg-gray-100 p-4 rounded-lg">
                <img 
                  src={chartUrl} 
                  alt="Generated Chart" 
                  className="max-w-full h-auto mx-auto"
                  onError={(e) => {
                    console.error('Image load error:', e)
                    setError('Failed to load chart image')
                  }}
                />
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Chart URL:</label>
                <textarea
                  value={chartUrl}
                  readOnly
                  className="w-full p-2 border border-gray-300 rounded text-xs"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 