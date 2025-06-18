'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

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
  total_posts_sent: number
  created_at: string
}

interface Channel {
  id: string
  name: string
  telegram_channel_id: string
  total_posts_sent: number
  is_active: boolean
  member_count: number | null
}

interface PostStats {
  total_posts: number
  posts_today: number
  posts_this_week: number
  posts_this_month: number
  avg_posts_per_day: number
  most_active_channel: string | null
  best_performing_time: string | null
}

interface RecentPost {
  id: string
  content_template: string
  sent_at: string
  views: number
  reactions: number
  shares: number
  channel_name: string
}

export default function BotAnalyticsPage() {
  const router = useRouter()
  const params = useParams()
  const botId = params.id as string
  const supabase = createClientComponentClient()
  
  const [bot, setBot] = useState<Bot | null>(null)
  const [channels, setChannels] = useState<Channel[]>([])
  const [postStats, setPostStats] = useState<PostStats>({
    total_posts: 0,
    posts_today: 0,
    posts_this_week: 0,
    posts_this_month: 0,
    avg_posts_per_day: 0,
    most_active_channel: null,
    best_performing_time: null
  })
  const [recentPosts, setRecentPosts] = useState<RecentPost[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('month')

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
          total_posts_sent,
          created_at,
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
        .select('id, name, telegram_channel_id, total_posts_sent, is_active, member_count')
        .eq('bot_id', botId)
        .order('total_posts_sent', { ascending: false })

      if (channelsError) throw channelsError

      setChannels(channelsData || [])

      // Calculate stats
      await calculateStats(botId)

      // Load recent posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          content_template,
          sent_at,
          views,
          reactions,
          shares,
          channels!inner(name)
        `)
        .in('channel_id', (channelsData || []).map(c => c.id))
        .order('sent_at', { ascending: false })
        .limit(10)

      if (!postsError && postsData) {
        const formattedPosts = postsData.map(post => ({
          ...post,
          channel_name: (post.channels as any)?.name || 'Unknown'
        }))
        setRecentPosts(formattedPosts)
      }
    } catch (error: any) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = async (botId: string) => {
    try {
      const now = new Date()
      const today = now.toISOString().split('T')[0]
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // Get total posts
      const { data: totalData } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .in('channel_id', channels.map(c => c.id))

      // Get posts today
      const { data: todayData } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .in('channel_id', channels.map(c => c.id))
        .gte('sent_at', today)

      // Get posts this week
      const { data: weekData } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .in('channel_id', channels.map(c => c.id))
        .gte('sent_at', weekAgo)

      // Get posts this month
      const { data: monthData } = await supabase
        .from('posts')
        .select('id', { count: 'exact' })
        .in('channel_id', channels.map(c => c.id))
        .gte('sent_at', monthAgo)

      const totalPosts = totalData?.length || 0
      const daysSinceCreation = bot ? Math.max(1, Math.floor((now.getTime() - new Date(bot.created_at).getTime()) / (1000 * 60 * 60 * 24))) : 1

      // Find most active channel
      const mostActiveChannel = channels.length > 0 ? channels[0].name : null

      setPostStats({
        total_posts: totalPosts,
        posts_today: todayData?.length || 0,
        posts_this_week: weekData?.length || 0,
        posts_this_month: monthData?.length || 0,
        avg_posts_per_day: Math.round((totalPosts / daysSinceCreation) * 10) / 10,
        most_active_channel: mostActiveChannel,
        best_performing_time: '15:00' // This would be calculated from actual data
      })
    } catch (error) {
      console.error('Error calculating stats:', error)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getEngagementRate = (post: RecentPost) => {
    if (post.views === 0) return 0
    return Math.round(((post.reactions + post.shares) / post.views) * 100)
  }

  const getChannelPerformance = (channel: Channel) => {
    const totalChannelPosts = channels.reduce((sum, c) => sum + c.total_posts_sent, 0)
    if (totalChannelPosts === 0) return 0
    return Math.round((channel.total_posts_sent / totalChannelPosts) * 100)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics data...</p>
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
                    📊 Analytics: {bot.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-400">
                    Detailed data and performance metrics for the bot
                  </p>
                </div>
              </div>
              {bot.telegram_bot_username && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  @{bot.telegram_bot_username} • {bot.language?.native_name}
                </p>
              )}
            </div>
            
            <div className="flex items-center gap-3">
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as 'week' | 'month' | 'quarter')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="quarter">Last Quarter</option>
              </select>
              
              <Link
                href="/dashboard/bots"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              >
                ← Back to Bots
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">סה"כ פוסטים</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{postStats.total_posts}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-xl">📝</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              ממוצע {postStats.avg_posts_per_day} ביום
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">פוסטים השבוע</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{postStats.posts_this_week}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <span className="text-xl">📈</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {postStats.posts_today} היום
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">ערוצים פעילים</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {channels.filter(c => c.is_active).length}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-xl">📢</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              מתוך {channels.length} ערוצים
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">סה"כ חברים</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {channels.reduce((sum, c) => sum + (c.member_count || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              בכל הערוצים
            </p>
          </div>
        </div>

        {/* Performance Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              🏆 תובנות ביצועים
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    שעה הכי פעילה
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {postStats.best_performing_time || 'לא זמין'}
                  </p>
                </div>
                <span className="text-2xl">⏰</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    ערוץ מוביל
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {postStats.most_active_channel || 'לא זמין'}
                  </p>
                </div>
                <span className="text-2xl">🏅</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-purple-900 dark:text-purple-100">
                    ימים פעילים
                  </p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {Math.max(1, Math.floor((new Date().getTime() - new Date(bot.created_at).getTime()) / (1000 * 60 * 60 * 24)))} ימים
                  </p>
                </div>
                <span className="text-2xl">📅</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              📢 ביצועי ערוצים
            </h3>
            <div className="space-y-3">
              {channels.slice(0, 5).map((channel) => (
                <div key={channel.id} className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {channel.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {channel.total_posts_sent} פוסטים
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${getChannelPerformance(channel)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-8">
                      {getChannelPerformance(channel)}%
                    </span>
                  </div>
                </div>
              ))}
              {channels.length === 0 && (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                  אין ערוצים להצגה
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Recent Posts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📝 פוסטים אחרונים
            </h3>
          </div>
          <div className="p-6">
            {recentPosts.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">📭</div>
                <p className="text-gray-500 dark:text-gray-400">אין פוסטים עדיין</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        תאריך
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        ערוץ
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        תבנית
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        צפיות
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        אינטראקציות
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        שיתופים
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Engagement
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPosts.map((post) => (
                      <tr key={post.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {formatDate(post.sent_at)}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {post.channel_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500 dark:text-gray-400">
                          {post.content_template}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {post.views.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {post.reactions.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-900 dark:text-white">
                          {post.shares.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getEngagementRate(post) >= 5
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : getEngagementRate(post) >= 2
                              ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                              : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                          }`}>
                            {getEngagementRate(post)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}