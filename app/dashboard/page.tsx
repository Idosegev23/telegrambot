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
  total_posts_sent: number
  last_post_at: string | null
  region: {
    name: string
    flag_emoji: string
  }
  language: {
    name: string
    native_name: string
  }
}

interface DashboardStats {
  totalBots: number
  activeBots: number
  totalPosts: number
  todayPosts: number
}

export default function DashboardPage() {
  const [bots, setBots] = useState<Bot[]>([])
  const [stats, setStats] = useState<DashboardStats>({
    totalBots: 0,
    activeBots: 0,
    totalPosts: 0,
    todayPosts: 0
  })
  const [userRole, setUserRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
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
      fetchDashboardData(user.id)
    }

    getUser()
  }, [supabase, router])

  const fetchDashboardData = async (userId: string) => {
    try {
      // Get user's manager record
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('id, role')
        .eq('user_id', userId)
        .single()

      if (managerError) {
        console.error('Error fetching manager:', managerError)
        return
      }

      setUserRole(managerData?.role || '')

      // Fetch bots with relations
      const { data: botsData, error: botsError } = await supabase
        .from('bots')
        .select(`
          id,
          name,
          telegram_bot_username,
          is_active,
          total_posts_sent,
          last_post_at,
          region:regions(name, flag_emoji),
          language:languages(name, native_name)
        `)
        .eq('manager_id', managerData.id)
        .order('created_at', { ascending: false })

      if (botsError) {
        console.error('Error fetching bots:', botsError)
        return
      }

      // Calculate stats
      const totalBots = botsData?.length || 0
      const activeBots = botsData?.filter(bot => bot.is_active).length || 0
      const totalPosts = botsData?.reduce((sum, bot) => sum + (bot.total_posts_sent || 0), 0) || 0

      // Calculate today's posts (would need a posts table query for accurate count)
      const today = new Date().toISOString().split('T')[0]
      const { data: todayPostsData } = await supabase
        .from('posts')
        .select('id')
        .in('bot_id', botsData?.map(bot => bot.id) || [])
        .gte('created_at', today)

      // Fix the type issue with relations
      const formattedBots = botsData?.map(bot => ({
        ...bot,
        region: Array.isArray(bot.region) ? bot.region[0] : bot.region,
        language: Array.isArray(bot.language) ? bot.language[0] : bot.language
      })) || []
      
      setBots(formattedBots)
      setStats({
        totalBots,
        activeBots,
        totalPosts,
        todayPosts: todayPostsData?.length || 0
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
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
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-white">🤖</span>
              </div>
              <div className="ml-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  TriRoars Dashboard
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Advanced Telegram Bot Management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {userRole === 'super_admin' && (
                <Link
                  href="/dashboard/admin"
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
                >
                  🔧 Admin Panel
                </Link>
              )}
              <Link
                href="/dashboard/bots"
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                🤖 Manage Bots
              </Link>
              <Link
                href="/dashboard/bots/new"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200"
              >
                + New Bot
              </Link>
              <button 
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <span className="text-blue-600 dark:text-blue-400 text-xl">🤖</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Bots</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalBots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <span className="text-green-600 dark:text-green-400 text-xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Bots</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeBots}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <span className="text-purple-600 dark:text-purple-400 text-xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Posts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPosts}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <span className="text-orange-600 dark:text-orange-400 text-xl">📈</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Posts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todayPosts}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bots Grid */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Your Bots</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage and monitor your Telegram bots</p>
            </div>
            <Link
              href="/dashboard/bots"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium text-sm transition-colors"
            >
              View All Bots →
            </Link>
          </div>

          {bots.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-xl">🤖</span>
              </div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No bots yet</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Create your first Telegram bot to get started with automated sports content.
              </p>
              <Link
                href="/dashboard/bots/new"
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Create Your First Bot
              </Link>
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bots.map((bot) => (
                  <div key={bot.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <span className="text-2xl mr-2">{bot.region.flag_emoji}</span>
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white">{bot.name}</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {bot.telegram_bot_username || 'No username set'}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        bot.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      }`}>
                        {bot.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Region:</span>
                        <span className="text-gray-900 dark:text-white">{bot.region.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Language:</span>
                        <span className="text-gray-900 dark:text-white">{bot.language.name}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Posts sent:</span>
                        <span className="text-gray-900 dark:text-white">{bot.total_posts_sent}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Last post:</span>
                        <span className="text-gray-900 dark:text-white">{formatLastPost(bot.last_post_at)}</span>
                      </div>
                    </div>

                    {/* Main Content Management Button */}
                    <Link
                      href={`/dashboard/bots/${bot.id}/content`}
                      className="w-full mb-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all duration-200 text-center block"
                    >
                      🚀 Manage Content
                    </Link>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/dashboard/bots/${bot.id}/edit`}
                        className="flex-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-3 py-2 rounded-md transition-colors text-center"
                      >
                        ⚙️ Settings
                      </Link>
                      <Link
                        href={`/dashboard/bots/${bot.id}/analytics`}
                        className="flex-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/40 px-3 py-2 rounded-md transition-colors text-center"
                      >
                        📊 Analytics
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
} 