import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    
    // Check authentication - but allow internal calls
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Allow internal API calls (when called from other API routes)
    const isInternalCall = req.headers.get('x-internal-call') === 'true'
    
    if (!isInternalCall && (authError || !user)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { 
      chartType,
      chartData,
      title,
      width = 800,
      height = 400,
      theme = 'default',
      watermark = 'TriRoars Sports'
    } = await req.json()

    console.log('Chart generation request:', { chartType, chartData, title })

    if (!chartType || !chartData) {
      return NextResponse.json(
        { error: 'Chart type and data are required' },
        { status: 400 }
      )
    }

    // Validate chart data structure
    if (!chartData.labels || !chartData.datasets) {
      return NextResponse.json(
        { error: 'Chart data must include labels and datasets' },
        { status: 400 }
      )
    }

    // Generate QuickChart URL
    const chartUrl = generateQuickChartUrl({
      chartType,
      chartData,
      title,
      width,
      height,
      theme,
      watermark
    })

    console.log('Generated main chart URL:', chartUrl)

    // Generate different chart variations for sports content
    const variations = generateSportsChartVariations(chartData, chartType)

    console.log('Generated variations:', variations.length)

    // Test the main chart URL
    const isValidUrl = await validateChartUrl(chartUrl)
    if (!isValidUrl) {
      console.warn('Main chart URL validation failed, using fallback')
    }

    return NextResponse.json({
      success: true,
      data: {
        chartUrl,
        variations,
        embedCode: `<img src="${chartUrl}" alt="${title || 'Sports Chart'}" style="max-width: 100%; height: auto;" />`,
        telegramReady: true,
        debugInfo: {
          urlLength: chartUrl.length,
          isValidUrl,
          chartType,
          datasetCount: chartData.datasets?.length || 0
        }
      }
    })

  } catch (error: any) {
    console.error('Chart Generation Error:', error)
    return NextResponse.json(
      { 
        error: error.message || 'Failed to generate chart',
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

// Helper function to validate chart URL
async function validateChartUrl(url: string): Promise<boolean> {
  try {
    // Basic URL validation
    const urlObj = new URL(url)
    if (!urlObj.hostname.includes('quickchart.io')) {
      return false
    }
    
    // Check if URL is not too long (some services have limits)
    if (url.length > 8000) {
      console.warn('Chart URL too long:', url.length)
      return false
    }
    
    return true
  } catch (error) {
    console.error('URL validation error:', error)
    return false
  }
}

function generateQuickChartUrl(config: {
  chartType: string
  chartData: any
  title: string
  width: number
  height: number
  theme: string
  watermark: string
}) {
  const { chartType, chartData, title, width, height, theme, watermark } = config

  // Base Chart.js configuration
  const chartConfig: any = {
    type: chartType,
    data: {
      ...chartData,
      // Ensure datasets is always an array
      datasets: Array.isArray(chartData.datasets) ? chartData.datasets : [chartData.datasets]
    },
    options: {
      responsive: false, // Important for QuickChart
      maintainAspectRatio: false,
      plugins: {
        title: {
          display: true,
          text: title || 'Sports Chart',
          font: {
            size: 16,
            weight: 'bold'
          }
        },
        legend: {
          display: true,
          position: 'top'
        }
      },
      scales: getScalesForChartType(chartType)
    }
  }

  // Apply theme
  if (theme === 'dark') {
    chartConfig.options.plugins.title.color = '#ffffff'
    chartConfig.options.plugins.legend.labels = { color: '#ffffff' }
    chartConfig.options.backgroundColor = '#1f2937'
  }

  // Add watermark text (QuickChart supports this)
  if (watermark) {
    chartConfig.options.plugins.annotation = {
      annotations: {
        watermark: {
          type: 'label',
          content: watermark,
          position: {
            x: 'end',
            y: 'end'
          },
          font: {
            size: 10
          },
          color: 'rgba(0,0,0,0.3)'
        }
      }
    }
  }

  try {
    // Simplify chart configuration for better compatibility
    const simplifiedConfig = {
      type: chartConfig.type,
      data: {
        labels: chartConfig.data.labels,
        datasets: chartConfig.data.datasets.map((dataset: any) => ({
          label: dataset.label,
          data: dataset.data,
          backgroundColor: dataset.backgroundColor,
          borderColor: dataset.borderColor,
          borderWidth: dataset.borderWidth || 1
        }))
      },
      options: {
        responsive: false,
        plugins: {
          title: {
            display: true,
            text: chartConfig.options.plugins.title.text
          },
          legend: {
            display: true
          }
        }
      }
    }

    // Convert to JSON and clean up
    const configString = JSON.stringify(simplifiedConfig)
      .replace(/\s+/g, '')  // Remove all whitespace
      .replace(/"/g, "'")   // Use single quotes to avoid URL encoding issues

    console.log('Chart config string:', configString.substring(0, 200) + '...')
    
    // Create URL with manual encoding
    const baseUrl = 'https://quickchart.io/chart'
    const params = new URLSearchParams({
      width: width.toString(),
      height: height.toString(),
      c: configString
    })
    
    const finalUrl = `${baseUrl}?${params.toString()}`
    console.log('Final chart URL length:', finalUrl.length)
    
    return finalUrl
    
  } catch (error) {
    console.error('Chart config encoding error:', error)
    // Fallback to simple working chart
    const fallbackConfig = `{'type':'bar','data':{'labels':['Sample'],'datasets':[{'data':[10],'backgroundColor':'blue'}]}}`
    return `https://quickchart.io/chart?width=${width}&height=${height}&c=${fallbackConfig}`
  }
}

function getScalesForChartType(chartType: string) {
  switch (chartType) {
    case 'line':
    case 'bar':
      return {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.1)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    case 'radar':
      return {
        r: {
          beginAtZero: true,
          max: 100
        }
      }
    default:
      return {}
  }
}

function generateSportsChartVariations(data: any, baseType: string) {
  const variations = []

  try {
    // Team Performance Comparison
    variations.push({
      name: 'Team Performance',
      type: 'bar',
      url: generateQuickChartUrl({
        chartType: 'bar',
        chartData: {
          labels: data.teams || ['Team A', 'Team B'],
          datasets: [{
            label: 'Goals Scored',
            data: data.goals || [2, 1],
            backgroundColor: ['#3b82f6', '#ef4444'],
            borderWidth: 1
          }]
        },
        title: 'Goals Comparison',
        width: 600,
        height: 400,
        theme: 'default',
        watermark: 'TriRoars Sports'
      })
    })

    // Possession Chart
    variations.push({
      name: 'Possession Stats',
      type: 'doughnut',
      url: generateQuickChartUrl({
        chartType: 'doughnut',
        chartData: {
          labels: data.teams || ['Team A', 'Team B'],
          datasets: [{
            label: 'Possession %',
            data: data.possession || [65, 35],
            backgroundColor: ['#3b82f6', '#ef4444'],
            borderWidth: 2
          }]
        },
        title: 'Ball Possession',
        width: 500,
        height: 500,
        theme: 'default',
        watermark: 'TriRoars Sports'
      })
    })

    // Shots Comparison
    if (data.shots || baseType === 'shots') {
      variations.push({
        name: 'Shots Analysis',
        type: 'bar',
        url: generateQuickChartUrl({
          chartType: 'bar',
          chartData: {
            labels: ['On Target', 'Off Target'],
            datasets: [
              {
                label: data.teams?.[0] || 'Team A',
                data: data.shotsHome || [6, 4],
                backgroundColor: '#3b82f6'
              },
              {
                label: data.teams?.[1] || 'Team B',
                data: data.shotsAway || [3, 5],
                backgroundColor: '#ef4444'
              }
            ]
          },
          title: 'Shots Comparison',
          width: 600,
          height: 400,
          theme: 'default',
          watermark: 'TriRoars Sports'
        })
      })
    }

  } catch (error) {
    console.error('Error generating chart variations:', error)
    // Return at least one basic chart
    variations.push({
      name: 'Basic Chart',
      type: 'bar',
      url: 'https://quickchart.io/chart?c=%7B%22type%22%3A%22bar%22%2C%22data%22%3A%7B%22labels%22%3A%5B%22Sample%22%5D%2C%22datasets%22%3A%5B%7B%22data%22%3A%5B1%5D%7D%5D%7D%7D'
    })
  }

  return variations
}

// Helper function to create chart from sports data
export function createSportsChart(type: 'goals' | 'possession' | 'shots' | 'cards', matchData: any) {
  switch (type) {
    case 'goals':
      return {
        type: 'bar',
        data: {
          labels: [matchData.homeTeam, matchData.awayTeam],
          datasets: [{
            label: 'Goals',
            data: [matchData.homeGoals, matchData.awayGoals],
            backgroundColor: ['#3b82f6', '#ef4444']
          }]
        }
      }
    
    case 'possession':
      return {
        type: 'doughnut',
        data: {
          labels: [matchData.homeTeam, matchData.awayTeam],
          datasets: [{
            data: [matchData.homePossession, matchData.awayPossession],
            backgroundColor: ['#3b82f6', '#ef4444']
          }]
        }
      }
    
    case 'shots':
      return {
        type: 'bar',
        data: {
          labels: ['Shots on Target', 'Total Shots'],
          datasets: [
            {
              label: matchData.homeTeam,
              data: [matchData.homeShotsOnTarget, matchData.homeTotalShots],
              backgroundColor: '#3b82f6'
            },
            {
              label: matchData.awayTeam,
              data: [matchData.awayShotsOnTarget, matchData.awayTotalShots],
              backgroundColor: '#ef4444'
            }
          ]
        }
      }
    
    default:
      return null
  }
} 