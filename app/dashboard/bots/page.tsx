'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface Bot {
  id: string
  name: string
  telegram_bot_username: string | null
  is_active: boolean
  region: {
    name: string
    flag_emoji: string
  }
  language: {
    name: string
    native_name: string
  }
  auto_post_enabled: boolean
  max_posts_per_day: number
  created_at: string
  last_post_at: string | null
  total_posts_sent: number
  channels?: {
    id: string
    name: string
    telegram_channel_id: string
    auto_post: boolean
  }[]
}

export default function BotsPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      fetchBots(user.id)
    }

    getUser()
  }, [supabase, router])

  const fetchBots = async (userId: string) => {
    try {
      // Get user's manager record
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (managerError) {
        console.error('Error fetching manager:', managerError)
        return
      }

      // Fetch bots with all related data
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select(`
          id,
          name,
          telegram_bot_username,
          is_active,
          auto_post_enabled,
          max_posts_per_day,
          created_at,
          last_post_at,
          total_posts_sent,
          region:regions(name, flag_emoji),
          language:languages(name, native_name),
          channels(id, name, telegram_channel_id, auto_post)
        `)
        .eq('manager_id', managerData.id)
        .order('created_at', { ascending: false })

      if (botsError) {
        console.error('Error fetching bots:', botsError)
        return
      }

      // Fix the type issue with relations
      const formattedBots = botsData?.map(bot => ({
        ...bot,
        region: Array.isArray(bot.region) ? bot.region[0] : bot.region,
        language: Array.isArray(bot.language) ? bot.language[0] : bot.language
      })) || []
      
      setBots(formattedBots)
    } catch (error) {
      console.error('Error fetching bots:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleBotStatus = async (botId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('bots')
      .update({ is_active: !currentStatus })
      .eq('id', botId)

    if (!error) {
      setBots(prev => prev.map(bot => 
        bot.id === botId ? { ...bot, is_active: !currentStatus } : bot
      ))
    }
  }

  const deleteBot = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return
    }

    const { error } = await supabase
      .from('bots')
      .delete()
      .eq('id', botId)

    if (!error) {
      setBots(prev => prev.filter(bot => bot.id !== botId))
    }
  }

  const filteredBots = bots.filter(bot => {
    const matchesFilter = filter === 'all' || 
      (filter === 'active' && bot.is_active) || 
      (filter === 'inactive' && !bot.is_active)
    
    const matchesSearch = bot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (bot.telegram_bot_username && bot.telegram_bot_username.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesFilter && matchesSearch
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatLastPost = (dateString: string | null) => {
    if (!dateString) return 'Never'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    
    if (diffHours < 1) return 'Few minutes ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return `${Math.floor(diffHours / 24)} days ago`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                🤖 Bot Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your sports telegram bots efficiently
              </p>
            </div>
            
            <div className="flex gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              >
                ← Back to Dashboard
              </Link>
              <Link
                href="/dashboard/bots/new"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                + Create New Bot
              </Link>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <div className="flex gap-2">
              {(['all', 'active', 'inactive'] as const).map((filterType) => (
                <button
                  key={filterType}
                  onClick={() => setFilter(filterType)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === filterType
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {filterType === 'all' && 'All'}
                  {filterType === 'active' && 'Active'}
                  {filterType === 'inactive' && 'Inactive'}
                </button>
              ))}
            </div>
            
            <div className="flex-1 max-w-md">
              <input
                type="text"
                placeholder="Search bots..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bots Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredBots.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {bots.length === 0 ? 'No bots yet' : 'No bots found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {bots.length === 0 
                ? 'Create your first bot to get started'
                : 'Try changing the filters or search'
              }
            </p>
            {bots.length === 0 && (
              <Link
                href="/dashboard/bots/new"
                className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
              >
                + Create First Bot
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBots.map((bot) => (
              <div 
                key={bot.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200"
              >
                {/* Bot Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">{bot.region?.flag_emoji || '🌍'}</span>
                        <div>
                          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            {bot.name}
                          </h3>
                          {bot.telegram_bot_username && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              @{bot.telegram_bot_username}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          bot.is_active 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {bot.is_active ? '🟢 Active' : '🔴 Inactive'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400">
                          {bot.language?.native_name || bot.language?.name}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-1">
                      <button
                        onClick={() => toggleBotStatus(bot.id, bot.is_active)}
                        className={`p-2 rounded-lg transition-colors ${
                          bot.is_active
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900'
                            : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900'
                        }`}
                        title={bot.is_active ? 'Disable Bot' : 'Enable Bot'}
                      >
                        {bot.is_active ? '⏸️' : '▶️'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Bot Stats */}
                <div className="p-6">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {bot.total_posts_sent || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Posts Sent
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {bot.channels?.length || 0}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Channels
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Region:</span>
                      <span className="text-gray-900 dark:text-white">
                        {bot.region?.name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Last Post:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatLastPost(bot.last_post_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(bot.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Daily Posts:</span>
                      <span className="text-gray-900 dark:text-white">
                        Up to {bot.max_posts_per_day}
                      </span>
                    </div>
                  </div>

                  {/* Channels Preview */}
                  {bot.channels && bot.channels.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                        Active Channels:
                      </h4>
                      <div className="space-y-1">
                        {bot.channels.slice(0, 2).map((channel) => (
                          <div key={channel.id} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400 truncate">
                              {channel.name}
                            </span>
                            <span className={`px-1 py-0.5 rounded text-xs ${
                              channel.auto_post 
                                ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            }`}>
                              {channel.auto_post ? 'Auto' : 'Manual'}
                            </span>
                          </div>
                        ))}
                        {bot.channels.length > 2 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            And {bot.channels.length - 2} more channels...
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bot Actions */}
                <div className="px-6 pb-6">
                  {/* Main Manage Button */}
                  <Link
                    href={`/dashboard/bots/${bot.id}/content`}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 mb-3"
                  >
                    🤖 Manage Bot
                  </Link>
                  
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href={`/dashboard/bots/${bot.id}/edit`}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors text-xs"
                    >
                      ✏️ Edit
                    </Link>
                    <Link
                      href={`/dashboard/bots/${bot.id}/channels`}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors text-xs"
                    >
                      📢 Channels
                    </Link>
                    <Link
                      href={`/dashboard/bots/${bot.id}/analytics`}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-green-50 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors text-xs"
                    >
                      📊 Analytics
                    </Link>
                    <button
                      onClick={() => deleteBot(bot.id)}
                      className="flex items-center justify-center gap-1 px-2 py-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors text-xs"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}