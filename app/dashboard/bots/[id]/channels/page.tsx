'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Bot {
  id: string
  name: string
  telegram_bot_username: string | null
  region: {
    name: string
    flag_emoji: string
  }
  language: {
    name: string
    native_name: string
  }
}

interface Channel {
  id: string
  telegram_channel_id: string
  name: string
  description: string | null
  auto_post: boolean
  post_frequency_hours: number
  preferred_post_times: string[]
  is_active: boolean
  member_count: number | null
  last_post_at: string | null
  total_posts_sent: number
  created_at: string
}

export default function BotChannelsPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const botId = params.id
  const supabase = createClientComponentClient()
  
  const [bot, setBot] = useState<Bot | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [showAddChannel, setShowAddChannel] = useState(false)
  const [newChannel, setNewChannel] = useState({
    telegram_channel_id: '',
    name: '',
    description: '',
    auto_post: true,
    post_frequency_hours: 4,
    preferred_post_times: ['09:00', '15:00', '21:00']
  })
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [submitting, setSubmitting] = useState(false)
  const [discoveredChats, setDiscoveredChats] = useState<any[]>([])
  const [showDiscoveredChats, setShowDiscoveredChats] = useState(false)
  const [loadingDiscovered, setLoadingDiscovered] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      loadData(user.id)
    }

    getUser()
  }, [supabase, router, botId])

  const loadData = async (userId: string) => {
    try {
      // Get user's manager record
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('id')
        .eq('user_id', userId)
        .single()

      if (managerError) throw managerError

      // Load bot data
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .select(`
          id,
          name,
          telegram_bot_username,
          region:regions(name, flag_emoji),
          language:languages(name, native_name)
        `)
        .eq('id', botId)
        .eq('manager_id', managerData.id)
        .single()

      if (botError) {
        throw new Error('Bot not found or you do not have access to it')
      }

      // Fix the type issue with relations
      const formattedBot = {
        ...botData,
        region: Array.isArray(botData.region) ? botData.region[0] : botData.region,
        language: Array.isArray(botData.language) ? botData.language[0] : botData.language
      }

      setBot(formattedBot)

      // Load channels
      const { data: channelsData, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .eq('bot_id', botId)
        .order('created_at', { ascending: false })

      if (channelsError) throw channelsError

      setChannels(channelsData || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      setErrors({ general: error.message || 'Error loading data' })
    } finally {
      setLoading(false)
    }
  }

  const validateChannelId = (channelId: string): boolean => {
    // Telegram channel ID can be @username or -100xxxxxxxxx
    return channelId.startsWith('@') || /^-100\d{10}$/.test(channelId)
  }

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: {[key: string]: string} = {}

    if (!newChannel.telegram_channel_id.trim()) {
      newErrors.telegram_channel_id = 'Channel ID is required'
    } else if (!validateChannelId(newChannel.telegram_channel_id)) {
      newErrors.telegram_channel_id = 'Invalid channel ID - use @channel_name or -100xxxxxxxxxx'
    }

    if (!newChannel.name.trim()) {
      newErrors.name = 'Channel name is required'
    }

    if (newChannel.post_frequency_hours < 1 || newChannel.post_frequency_hours > 24) {
      newErrors.post_frequency_hours = 'Post frequency must be between 1 and 24 hours'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('channels')
        .insert({
          bot_id: botId,
          telegram_channel_id: newChannel.telegram_channel_id,
          name: newChannel.name,
          description: newChannel.description || null,
          auto_post: newChannel.auto_post,
          post_frequency_hours: newChannel.post_frequency_hours,
          preferred_post_times: newChannel.preferred_post_times,
          is_active: true,
          member_count: null,
          total_posts_sent: 0
        })
        .select()
        .single()

      if (error) throw error

      setChannels(prev => [data, ...prev])
      setNewChannel({
        telegram_channel_id: '',
        name: '',
        description: '',
        auto_post: true,
        post_frequency_hours: 4,
        preferred_post_times: ['09:00', '15:00', '21:00']
      })
      setShowAddChannel(false)
      setErrors({})
    } catch (error: any) {
      console.error('Error adding channel:', error)
      setErrors({ general: error.message || 'Error adding channel' })
    } finally {
      setSubmitting(false)
    }
  }

  const toggleChannelStatus = async (channelId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('channels')
      .update({ is_active: !currentStatus })
      .eq('id', channelId)

    if (!error) {
      setChannels(prev => prev.map(channel => 
        channel.id === channelId ? { ...channel, is_active: !currentStatus } : channel
      ))
    }
  }

  const deleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this channel? This action cannot be undone.')) {
      return
    }

    const { error } = await supabase
      .from('channels')
      .delete()
      .eq('id', channelId)

    if (!error) {
      setChannels(prev => prev.filter(channel => channel.id !== channelId))
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
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
    
    if (diffHours < 1) return 'Less than an hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays} days ago`
  }

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...newChannel.preferred_post_times]
    newTimes[index] = value
    setNewChannel(prev => ({ ...prev, preferred_post_times: newTimes }))
  }

  const addTimeSlot = () => {
    if (newChannel.preferred_post_times.length < 6) {
      setNewChannel(prev => ({
        ...prev,
        preferred_post_times: [...prev.preferred_post_times, '12:00']
      }))
    }
  }

  const removeTimeSlot = (index: number) => {
    if (newChannel.preferred_post_times.length > 1) {
      const newTimes = newChannel.preferred_post_times.filter((_, i) => i !== index)
      setNewChannel(prev => ({ ...prev, preferred_post_times: newTimes }))
    }
  }

  const discoverExistingChats = async () => {
    setLoadingDiscovered(true)
    try {
      const response = await fetch('/api/bots/get-chat-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bot_id: botId })
      })

      const data = await response.json()
      
      if (data.success) {
        setDiscoveredChats(data.chats)
        setShowDiscoveredChats(true)
      } else {
        setErrors({ discovery: data.error || 'Error discovering channels' })
      }
    } catch (error) {
      console.error('Error discovering chats:', error)
      setErrors({ discovery: 'Error connecting to server' })
    } finally {
      setLoadingDiscovered(false)
    }
  }

  const addDiscoveredChannel = (chat: any) => {
    setNewChannel({
      telegram_channel_id: chat.username ? `@${chat.username}` : chat.id.toString(),
      name: chat.title,
      description: `Auto-discovered channel (${chat.type})`,
      auto_post: true,
      post_frequency_hours: 4,
      preferred_post_times: ['09:00', '15:00', '21:00']
    })
    setShowDiscoveredChats(false)
    setShowAddChannel(true)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading channels data...</p>
        </div>
      </div>
    )
  }

  if (!bot) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Bot Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            The requested bot was not found or you do not have permission to access it
          </p>
          <Link
            href="/dashboard/bots"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
          >
            Back to Bots List
          </Link>
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
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{bot.region?.flag_emoji}</span>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                    📢 Channels: {bot.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Manage channels connected to this bot
                  </p>
                </div>
              </div>
              {bot.telegram_bot_username && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{bot.telegram_bot_username} • {bot.language?.native_name}
                </p>
              )}
            </div>
            
            <div className="flex gap-3">
              <Link
                href="/dashboard/bots"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              >
                ← Back to Bots
              </Link>
              <button
                onClick={discoverExistingChats}
                disabled={loadingDiscovered}
                className="px-4 py-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200 border border-green-300 dark:border-green-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingDiscovered ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600 inline-block mr-2"></div>
                    Discovering chats...
                  </>
                ) : (
                  '🔍 Discover Existing Channels'
                )}
              </button>
              <button
                onClick={() => setShowAddChannel(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200"
              >
                + Add Channel
              </button>
            </div>
          </div>

          {/* Bot Summary */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {channels.length}
              </div>
              <div className="text-sm text-blue-800 dark:text-blue-200">
                Total Channels
              </div>
            </div>
            <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {channels.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-green-800 dark:text-green-200">
                Active Channels
              </div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {channels.filter(c => c.auto_post).length}
              </div>
              <div className="text-sm text-purple-800 dark:text-purple-200">
                Auto-Posting
              </div>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900 rounded-lg p-4">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {channels.reduce((sum, c) => sum + c.total_posts_sent, 0)}
              </div>
              <div className="text-sm text-orange-800 dark:text-orange-200">
                Total Posts
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {(errors.general || errors.discovery) && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-400">⚠️</div>
              <div className="ml-3">
                <p className="text-sm text-red-800 dark:text-red-200">
                  {errors.general || errors.discovery}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discovered Chats Modal */}
      {showDiscoveredChats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🔍 Existing Channels Bot is Connected To
              </h3>
              <button
                onClick={() => setShowDiscoveredChats(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {discoveredChats.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">🤖</div>
                  <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No Existing Channels Found
                  </h4>
                  <p className="text-gray-600 dark:text-gray-400">
                    The bot hasn't sent messages to any channels yet or they don't appear in the history
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                    Found {discoveredChats.length} channels/groups where the bot is active
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {discoveredChats.map((chat) => (
                      <div 
                        key={chat.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                              {chat.title}
                            </h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                              {chat.username ? `@${chat.username}` : `ID: ${chat.id}`}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                chat.type === 'channel' 
                                  ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                                  : 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              }`}>
                                {chat.type === 'channel' ? '📢 Channel' : '👥 Group'}
                              </span>
                              {chat.member_count && (
                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200">
                                  👥 {chat.member_count.toLocaleString()} members
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => addDiscoveredChannel(chat)}
                            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            ➕ Add to System
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(chat.username ? `@${chat.username}` : chat.id.toString())
                            }}
                            className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                            title="Copy ID"
                          >
                            📋
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Channel Form */}
      {showAddChannel && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  ➕ Add New Channel
                </h3>
                <button
                  onClick={() => setShowAddChannel(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>
            </div>
            <form onSubmit={handleAddChannel} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telegram Channel ID *
                  </label>
                  <input
                    type="text"
                    value={newChannel.telegram_channel_id}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, telegram_channel_id: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.telegram_channel_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="@my_channel or -1001234567890"
                  />
                  {errors.telegram_channel_id && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.telegram_channel_id}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Bot must be an admin in the channel
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Channel Name *
                  </label>
                  <input
                    type="text"
                    value={newChannel.name}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Descriptive channel name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newChannel.description}
                  onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Optional description for this channel"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Post Frequency (hours) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={newChannel.post_frequency_hours}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, post_frequency_hours: parseInt(e.target.value) }))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.post_frequency_hours ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.post_frequency_hours && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.post_frequency_hours}</p>
                  )}
                </div>

                <div className="flex items-center pt-6">
                  <input
                    type="checkbox"
                    id="auto_post"
                    checked={newChannel.auto_post}
                    onChange={(e) => setNewChannel(prev => ({ ...prev, auto_post: e.target.checked }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_post" className="ml-2 block text-sm text-gray-900 dark:text-white">
                    Enable auto-posting
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preferred Posting Times
                </label>
                <div className="space-y-2">
                  {newChannel.preferred_post_times.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {newChannel.preferred_post_times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  ))}
                  {newChannel.preferred_post_times.length < 6 && (
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      + Add another time
                    </button>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddChannel(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Adding...
                    </>
                  ) : (
                    <>
                      ➕ Add Channel
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Channels List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {channels.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📢</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No channels connected yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Add your first channel to start posting automated content
            </p>
            <button
              onClick={() => setShowAddChannel(true)}
              className="inline-flex items-center bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200"
            >
              + Add First Channel
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Connected Channels</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {channels.map((channel) => (
                <div 
                  key={channel.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-200"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                          {channel.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                          {channel.telegram_channel_id}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            channel.is_active 
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {channel.is_active ? '🟢 Active' : '🔴 Inactive'}
                          </span>
                          {channel.auto_post && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                              🤖 Auto
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {channel.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {channel.description}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
                          {channel.total_posts_sent}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Posts sent
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                          {channel.post_frequency_hours}h
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Frequency
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => console.log('Edit channel:', channel.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors text-sm"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => deleteChannel(channel.id)}
                        className="flex items-center justify-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-100 dark:hover:bg-red-800 transition-colors text-sm"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 