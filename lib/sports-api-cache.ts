import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Cache configuration based on API documentation insights
const CACHE_DURATIONS = {
  // Live data - short cache
  'live_scores': 30000,      // 30 seconds (changes frequently)
  'fixtures_today': 300000,  // 5 minutes (schedule changes less often)
  
  // Historical data - longer cache
  'results': 3600000,        // 1 hour (historical results don't change)
  'standings': 1800000,      // 30 minutes (standings update after matches)
  
  // Static data - very long cache
  'teams': 86400000,         // 24 hours (team info rarely changes)
  'leagues': 86400000,       // 24 hours (league info rarely changes)
  'players': 43200000,       // 12 hours (player info changes seasonally)
}

// Rate limit aware caching based on API documentation
const API_RATE_LIMITS = {
  'soccersapi': { requests: 100, period: 3600000 }, // 100/hour
  'football-data-org': { requests: 10, period: 60000 }, // 10/minute  
  'api-football': { requests: 100, period: 86400000 }, // 100/day (free)
  'apifootball': { requests: 1000, period: 86400000 }, // 1000/day
}

interface CacheEntry {
  data: any
  timestamp: number
  api_source: string
  data_type: string
  key_params: string
  expires_at: number
}

class SportsAPICache {
  private memoryCache = new Map<string, CacheEntry>()
  
  // Generate smart cache key based on request parameters
  private generateCacheKey(dataType: string, params: Record<string, any>): string {
    // Sort params for consistent keys
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key]
        return result
      }, {} as Record<string, any>)
    
    const paramString = new URLSearchParams(sortedParams).toString()
    return `sports_${dataType}_${paramString}`
  }
  
  // Check if we should use cache or make fresh API call
  async shouldUseCache(dataType: string, params: Record<string, any>): Promise<CacheEntry | null> {
    const cacheKey = this.generateCacheKey(dataType, params)
    
    // Check memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(cacheKey)
    if (memoryEntry && Date.now() < memoryEntry.expires_at) {
      console.log(`✅ Memory cache hit for ${dataType}`)
      return memoryEntry
    }
    
    // Check database cache (slower but persistent)
    try {
      const { data: cacheData, error } = await supabase
        .from('sports_cache')
        .select('*')
        .eq('cache_key', cacheKey)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
        
      if (!error && cacheData) {
        const entry: CacheEntry = {
          data: cacheData.data,
          timestamp: new Date(cacheData.created_at).getTime(),
          api_source: cacheData.api_source,
          data_type: dataType,
          key_params: cacheKey,
          expires_at: new Date(cacheData.expires_at).getTime()
        }
        
        // Store in memory cache for faster future access
        this.memoryCache.set(cacheKey, entry)
        console.log(`✅ Database cache hit for ${dataType}`)
        return entry
      }
    } catch (error) {
      console.error('Cache lookup error:', error)
    }
    
    return null
  }
  
  // Store fresh data in cache with smart expiration
  async storeInCache(
    dataType: string, 
    params: Record<string, any>, 
    data: any, 
    apiSource: string
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(dataType, params)
    const duration = CACHE_DURATIONS[dataType as keyof typeof CACHE_DURATIONS] || 1800000 // 30 min default
    const expiresAt = Date.now() + duration
    
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      api_source: apiSource,
      data_type: dataType,
      key_params: cacheKey,
      expires_at: expiresAt
    }
    
    // Store in memory cache
    this.memoryCache.set(cacheKey, entry)
    
    // Store in database cache for persistence
    try {
      await supabase
        .from('sports_cache')
        .upsert({
          cache_key: cacheKey,
          data_type: dataType,
          data: data,
          api_source: apiSource,
          expires_at: new Date(expiresAt).toISOString(),
          created_at: new Date().toISOString()
        })
      
      console.log(`💾 Cached ${dataType} for ${duration/1000} seconds`)
    } catch (error) {
      console.error('Cache storage error:', error)
    }
  }
  
  // Check if API is rate limited and should be avoided
  async isAPIRateLimited(apiName: string): Promise<boolean> {
    const limits = API_RATE_LIMITS[apiName as keyof typeof API_RATE_LIMITS]
    if (!limits) return false
    
    try {
      const periodStart = new Date(Date.now() - limits.period)
      
      const { count } = await supabase
        .from('api_usage_log')
        .select('*', { count: 'exact' })
        .eq('api_name', apiName)
        .gte('created_at', periodStart.toISOString())
        
      const currentUsage = count || 0
      const isLimited = currentUsage >= limits.requests
      
      if (isLimited) {
        console.log(`🚫 API ${apiName} is rate limited: ${currentUsage}/${limits.requests}`)
      }
      
      return isLimited
    } catch (error) {
      console.error('Rate limit check error:', error)
      return false
    }
  }
  
  // Log API usage for rate limiting
  async logAPIUsage(apiName: string, success: boolean, responseTime: number): Promise<void> {
    try {
      await supabase
        .from('api_usage_log')
        .insert({
          api_name: apiName,
          success,
          response_time: responseTime,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      console.error('Usage logging error:', error)
    }
  }
  
  // Clean expired cache entries
  async cleanExpiredCache(): Promise<void> {
    // Clean memory cache
    const entries = Array.from(this.memoryCache.entries())
    for (const [key, entry] of entries) {
      if (Date.now() > entry.expires_at) {
        this.memoryCache.delete(key)
      }
    }
    
    // Clean database cache
    try {
      await supabase
        .from('sports_cache')
        .delete()
        .lt('expires_at', new Date().toISOString())
        
      console.log('🧹 Cleaned expired cache entries')
    } catch (error) {
      console.error('Cache cleanup error:', error)
    }
  }
  
  // Get cache statistics
  async getCacheStats(): Promise<{
    memory_entries: number
    database_entries: number
    hit_rate: number
    storage_size: string
  }> {
    try {
      const { count: dbCount } = await supabase
        .from('sports_cache')
        .select('*', { count: 'exact' })
        .gt('expires_at', new Date().toISOString())
        
      // Calculate approximate storage size
      const values = Array.from(this.memoryCache.values())
      const memorySize = JSON.stringify(values).length
      
      return {
        memory_entries: this.memoryCache.size,
        database_entries: dbCount || 0,
        hit_rate: 0, // Would need hit/miss tracking
        storage_size: `${(memorySize / 1024).toFixed(1)} KB`
      }
    } catch (error) {
      console.error('Cache stats error:', error)
      return {
        memory_entries: this.memoryCache.size,
        database_entries: 0,
        hit_rate: 0,
        storage_size: '0 KB'
      }
    }
  }
}

export const sportsCache = new SportsAPICache()

// Auto-cleanup every hour
setInterval(() => {
  sportsCache.cleanExpiredCache()
}, 3600000) 