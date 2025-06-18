import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface SportsAPI {
  id: string
  name: string
  api_url: string
  api_key: string
  rate_limit_per_hour: number
  daily_calls_used: number
  daily_calls_limit: number
  is_active: boolean
  priority: number
  last_called_at: string | null
}

class SportsAPIManager {
  private supabase = createClientComponentClient()
  private apis: SportsAPI[] = []
  private currentAPIIndex = 0

  async loadAPIs(): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('sports_apis')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: true })

      if (error) throw error

      this.apis = data || []
    } catch (error) {
      console.error('Error loading sports APIs:', error)
      throw error
    }
  }

  private decryptAPIKey(encryptedKey: string): string {
    // In production, this should use proper encryption/decryption
    // For now, using simple base64 decoding
    try {
      return atob(encryptedKey)
    } catch (error) {
      console.error('Error decrypting API key:', error)
      return ''
    }
  }

  async getAvailableAPI(): Promise<SportsAPI | null> {
    if (this.apis.length === 0) {
      await this.loadAPIs()
    }

    // Find the next available API that hasn't exceeded its limits
    for (let i = 0; i < this.apis.length; i++) {
      const api = this.apis[this.currentAPIIndex]
      
      if (api.daily_calls_used < api.daily_calls_limit) {
        return api
      }

      this.currentAPIIndex = (this.currentAPIIndex + 1) % this.apis.length
    }

    return null // All APIs have exceeded their limits
  }

  async makeAPICall(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const api = await this.getAvailableAPI()
    
    if (!api) {
      throw new Error('No available sports API with remaining quota')
    }

    const apiKey = this.decryptAPIKey(api.api_key)
    if (!apiKey) {
      throw new Error('Failed to decrypt API key')
    }

    try {
      // Construct the URL with parameters
      const url = new URL(endpoint, api.api_url)
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value.toString())
      })

      // Different APIs have different auth methods
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }

      if (api.name === 'api-football') {
        // RapidAPI format
        headers['X-RapidAPI-Key'] = apiKey
        headers['X-RapidAPI-Host'] = 'api-football-v1.p.rapidapi.com'
      } else if (api.name === 'football-data-org') {
        // Football Data format
        headers['X-Auth-Token'] = apiKey
      } else {
        // Default format for most APIs
        headers['Authorization'] = `Bearer ${apiKey}`
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers,
      })

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()

      // Update the call count in the database
      await this.updateAPIUsage(api.id)

      return data
    } catch (error) {
      console.error('Error making API call:', error)
      throw error
    }
  }

  private async updateAPIUsage(apiId: string): Promise<void> {
    try {
      // First get current count
      const { data: currentData } = await this.supabase
        .from('sports_apis')
        .select('daily_calls_used')
        .eq('id', apiId)
        .single()
      
      const newCount = (currentData?.daily_calls_used || 0) + 1
      
      const { error } = await this.supabase
        .from('sports_apis')
        .update({
          daily_calls_used: newCount,
          last_called_at: new Date().toISOString()
        })
        .eq('id', apiId)

      if (error) {
        console.error('Error updating API usage:', error)
      }
    } catch (error) {
      console.error('Error updating API usage:', error)
    }
  }

  // Specific methods for different types of data
  async getFixtures(date?: string, leagueId?: string): Promise<any> {
    const api = await this.getAvailableAPI()
    if (!api) throw new Error('No available API')

    const params: Record<string, any> = {}
    if (date) params.date = date
    if (leagueId) params.league = leagueId

    switch (api.name) {
      case 'football-data-org':
        return this.makeAPICall('matches', params)
      case 'api-football':
        return this.makeAPICall('fixtures', params)
      case 'apifootball':
        return this.makeAPICall('', { action: 'get_events', ...params })
      case 'soccersapi':
        return this.makeAPICall('matches', params)
      default:
        throw new Error(`Unsupported API: ${api.name}`)
    }
  }

  async getLiveScores(): Promise<any> {
    const api = await this.getAvailableAPI()
    if (!api) throw new Error('No available API')

    switch (api.name) {
      case 'football-data-org':
        return this.makeAPICall('matches', { status: 'LIVE' })
      case 'api-football':
        return this.makeAPICall('fixtures', { live: 'all' })
      case 'apifootball':
        return this.makeAPICall('', { action: 'get_events', from: new Date().toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] })
      case 'soccersapi':
        return this.makeAPICall('matches/live', {})
      default:
        throw new Error(`Unsupported API: ${api.name}`)
    }
  }

  async getLeagues(country?: string): Promise<any> {
    const api = await this.getAvailableAPI()
    if (!api) throw new Error('No available API')

    const params: Record<string, any> = {}
    if (country) params.country = country

    switch (api.name) {
      case 'football-data-org':
        return this.makeAPICall('competitions', params)
      case 'api-football':
        return this.makeAPICall('leagues', params)
      case 'apifootball':
        return this.makeAPICall('', { action: 'get_leagues', ...params })
      case 'soccersapi':
        return this.makeAPICall('leagues', params)
      default:
        throw new Error(`Unsupported API: ${api.name}`)
    }
  }

  async getTeams(leagueId: string): Promise<any> {
    const api = await this.getAvailableAPI()
    if (!api) throw new Error('No available API')

    switch (api.name) {
      case 'football-data-org':
        return this.makeAPICall(`competitions/${leagueId}/teams`, {})
      case 'api-football':
        return this.makeAPICall('teams', { league: leagueId })
      case 'apifootball':
        return this.makeAPICall('', { action: 'get_teams', league_id: leagueId })
      case 'soccersapi':
        return this.makeAPICall(`leagues/${leagueId}/teams`, {})
      default:
        throw new Error(`Unsupported API: ${api.name}`)
    }
  }

  // Reset daily counters (should be called by a cron job daily)
  async resetDailyCounters(): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('sports_apis')
        .update({ daily_calls_used: 0 })
        .neq('id', '00000000-0000-0000-0000-000000000000') // Update all

      if (error) {
        console.error('Error resetting daily counters:', error)
      }
    } catch (error) {
      console.error('Error resetting daily counters:', error)
    }
  }
}

export const sportsAPIManager = new SportsAPIManager()
export type { SportsAPI } 