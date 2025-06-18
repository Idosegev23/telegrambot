import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get all sports APIs from database
    const { data: sportsAPIs, error: apisError } = await supabase
      .from('sports_apis')
      .select('*')
      .order('priority', { ascending: true })

    if (apisError) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch APIs from database',
        details: apisError.message
      })
    }

    // Test each API key
    const apiTests = []
    
    for (const api of sportsAPIs || []) {
      const apiTest = {
        name: api.name,
        url: api.api_url,
        is_active: api.is_active,
        priority: api.priority,
        has_api_key: !!api.api_key,
        api_key_length: api.api_key ? api.api_key.length : 0,
        api_key_preview: api.api_key ? `${api.api_key.substring(0, 10)}...` : 'No key',
        daily_calls_used: api.daily_calls_used,
        daily_calls_limit: api.daily_calls_limit,
        last_called_at: api.last_called_at,
        test_result: null as any
      }

      // Only test active APIs with keys
      if (api.is_active && api.api_key) {
        try {
          let testUrl = ''
          let headers: Record<string, string> = {
            'Content-Type': 'application/json'
          }

          switch (api.name) {
            case 'football-data-org':
              testUrl = `${api.api_url}competitions`
              headers['X-Auth-Token'] = api.api_key
              break
              
            case 'api-football':
              testUrl = `${api.api_url}status`
              headers['X-RapidAPI-Key'] = api.api_key
              headers['X-RapidAPI-Host'] = 'api-football-v1.p.rapidapi.com'
              break
              
            case 'apifootball':
              testUrl = `${api.api_url}/?action=get_countries&APIkey=${api.api_key}`
              break
              
            case 'soccersapi':
              testUrl = `${api.api_url}leagues`
              headers['Authorization'] = `Bearer ${api.api_key}`
              break
              
            default:
              apiTest.test_result = { error: 'Unknown API type' }
              continue
          }

          console.log(`Testing ${api.name} with URL: ${testUrl}`)
          
          const response = await fetch(testUrl, {
            method: 'GET',
            headers,
            signal: AbortSignal.timeout(5000) // 5 second timeout
          })

          const responseText = await response.text()
          let responseData

          try {
            responseData = JSON.parse(responseText)
          } catch {
            responseData = responseText
          }

          apiTest.test_result = {
            status: response.status,
            statusText: response.statusText,
            success: response.ok,
            data: typeof responseData === 'string' ? responseData.substring(0, 200) : responseData,
            response_size: responseText.length
          }

        } catch (error: any) {
          apiTest.test_result = {
            error: error.message,
            timeout: error.name === 'AbortError'
          }
        }
      } else {
        apiTest.test_result = {
          skipped: true,
          reason: !api.is_active ? 'API not active' : 'No API key'
        }
      }

      apiTests.push(apiTest)
    }

    return NextResponse.json({
      success: true,
      total_apis: apiTests.length,
      active_apis: apiTests.filter(api => api.is_active).length,
      apis_with_keys: apiTests.filter(api => api.has_api_key).length,
      apis: apiTests,
      tested_at: new Date().toISOString()
    })

  } catch (error: any) {
    console.error('Error checking API keys:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to check API keys' },
      { status: 500 }
    )
  }
} 