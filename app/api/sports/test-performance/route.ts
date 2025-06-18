import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Performance testing with timeouts
const API_TIMEOUT = 30000 // 30 seconds
const TEST_TIMEOUT = 120000 // 2 minutes total

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    return response
  } catch (error) {
    clearTimeout(timeoutId)
    if (error instanceof Error && error.name === 'AbortError') {
      console.log(`Request timed out after ${timeout}ms`)
      return null
    }
    throw error
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Get all sports APIs
    const { data: sportsAPIs, error } = await supabase
      .from('sports_apis')
      .select('*')
      .eq('is_active', true)

    if (error || !sportsAPIs) {
      return NextResponse.json(
        { error: 'No sports APIs found' },
        { status: 404 }
      )
    }

    console.log(`🔍 Testing ${sportsAPIs.length} APIs with 30s timeout each...`)

    const results = []
    
    // Test each API with timeout
    for (const api of sportsAPIs) {
      const apiStartTime = Date.now()
      
      try {
        console.log(`\n⏱️  Testing ${api.name}...`)
        
        // Test endpoint for results (most reliable)
        const testResult = await testAPI(api, 'results')
        
        const duration = Date.now() - apiStartTime
        
        results.push({
          name: api.name,
          url: api.api_url,
          status: testResult.success ? 'success' : 'failed',
          duration: duration,
          timeout: duration >= API_TIMEOUT,
          response_size: testResult.dataSize || 0,
          error: testResult.error || null,
          rate_limit_info: testResult.rateLimitInfo || null
        })
        
        console.log(`✅ ${api.name}: ${duration}ms`)
        
      } catch (error) {
        const duration = Date.now() - apiStartTime
        results.push({
          name: api.name,
          url: api.api_url,
          status: 'error',
          duration: duration,
          timeout: duration >= API_TIMEOUT,
          response_size: 0,
          error: error instanceof Error ? error.message : 'Unknown error',
          rate_limit_info: null
        })
        
        console.log(`❌ ${api.name}: ${error}`)
      }
    }

    const totalTime = Date.now() - startTime
    
    // Performance summary
    const summary = {
      total_apis_tested: sportsAPIs.length,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      timed_out: results.filter(r => r.timeout).length,
      average_response_time: Math.round(
        results.filter(r => !r.timeout).reduce((sum, r) => sum + r.duration, 0) / 
        results.filter(r => !r.timeout).length
      ) || 0,
      fastest_api: results.filter(r => r.status === 'success').sort((a, b) => a.duration - b.duration)[0]?.name || 'None',
      slowest_api: results.filter(r => r.status === 'success').sort((a, b) => b.duration - a.duration)[0]?.name || 'None',
      total_test_time: totalTime
    }

    console.log(`\n📊 Performance Summary:`)
    console.log(`   Total APIs: ${summary.total_apis_tested}`)
    console.log(`   Successful: ${summary.successful}`)
    console.log(`   Failed: ${summary.failed}`)
    console.log(`   Timed out: ${summary.timed_out}`)
    console.log(`   Average time: ${summary.average_response_time}ms`)
    console.log(`   Fastest: ${summary.fastest_api}`)
    console.log(`   Total time: ${summary.total_test_time}ms`)

    return NextResponse.json({
      success: true,
      summary,
      results: results.sort((a, b) => a.duration - b.duration), // Sort by speed
      tested_at: new Date().toISOString()
    })

  } catch (error) {
    console.error('Performance test failed:', error)
    return NextResponse.json(
      { 
        error: 'Performance test failed',
        duration: Date.now() - startTime
      },
      { status: 500 }
    )
  }
}

async function testAPI(api: any, dataType: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  // Decrypt API key
  const apiKey = api.api_key?.trim()
  if (!apiKey) {
    throw new Error('No API key available')
  }

  let endpoint = ''
  
  // Build endpoint based on API type
  switch (api.name) {
    case 'football-data-org':
      headers['X-Auth-Token'] = apiKey
      endpoint = '/matches?status=FINISHED&limit=10'
      break

    case 'api-football':
      headers['X-RapidAPI-Key'] = apiKey
      headers['X-RapidAPI-Host'] = 'api-football-v1.p.rapidapi.com'
      endpoint = '/fixtures?last=10'
      break

    case 'apifootball':
      endpoint = `/?action=get_events&APIkey=${apiKey}&from=${new Date(Date.now() - 7*24*60*60*1000).toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}&match_live=0`
      break

    case 'soccersapi':
      headers['Authorization'] = `Bearer ${apiKey}`
      endpoint = '/matches?status=finished&limit=10'
      break

    default:
      throw new Error(`Unsupported API: ${api.name}`)
  }

  const url = `${api.api_url.replace(/\/$/, '')}${endpoint}`
  console.log(`   📡 ${url}`)

  const response = await fetchWithTimeout(url, { headers }, API_TIMEOUT)
  
  if (!response) {
    return {
      success: false,
      error: 'Request timed out',
      dataSize: 0
    }
  }

  // Get rate limit info from headers
  const rateLimitInfo = {
    remaining: response.headers.get('X-RateLimit-Remaining') || 
               response.headers.get('X-API-Sports-Requests-Remaining') ||
               response.headers.get('x-requests-remaining'),
    limit: response.headers.get('X-RateLimit-Limit') || 
           response.headers.get('X-API-Sports-Requests-Limit') ||
           response.headers.get('x-requests-limit'),
    reset: response.headers.get('X-RateLimit-Reset') || 
           response.headers.get('X-API-Sports-Requests-Reset')
  }

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      error: `HTTP ${response.status}: ${errorText}`,
      dataSize: errorText.length,
      rateLimitInfo
    }
  }

  const data = await response.json()
  const dataSize = JSON.stringify(data).length

  // Check if data contains actual results
  const hasValidData = 
    (data.matches && Array.isArray(data.matches) && data.matches.length > 0) ||
    (data.response && Array.isArray(data.response) && data.response.length > 0) ||
    (Array.isArray(data) && data.length > 0)

  return {
    success: hasValidData,
    error: hasValidData ? null : 'No valid data returned',
    dataSize,
    rateLimitInfo
  }
} 