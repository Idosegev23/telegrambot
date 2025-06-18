'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

export default function HomePage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error) {
          console.error('Auth error:', error)
          setError(error.message)
        } else {
          setUser(user)
          
          if (user) {
            router.push('/dashboard')
            return
          }
        }
      } catch (err) {
        console.error('Unexpected error:', err)
        setError('Failed to load user session')
      } finally {
        setLoading(false)
      }
    }

    getUser()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-xl">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg"
            >
              Retry
            </button>
            <Link
              href="/auth/login"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg inline-block"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <span className="text-2xl font-bold text-white">🤖</span>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            TriRoars
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block">
              Bot Manager
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Professional platform for managing multi-language Telegram bots with sports content tailored for African markets
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/login"
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Sign In to Dashboard
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Access restricted to authorized managers only
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-ethiopia-green rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-xl">🌍</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Multi-language Support
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Amharic, English, Swahili with AI-powered automatic translation
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-xl">⚽</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Live Sports Content
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Real-time updates from local and international leagues
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center mb-4">
              <span className="text-white text-xl">🚀</span>
            </div>
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-white">
              Full Automation
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Automatic posting, smart scheduling and real-time notifications
            </p>
          </div>
        </div>

        {/* Stats Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-xl">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-white">
            Impressive Numbers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">3</div>
              <div className="text-gray-600 dark:text-gray-400">Supported Languages</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">5</div>
              <div className="text-gray-600 dark:text-gray-400">Regions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">24/7</div>
              <div className="text-gray-600 dark:text-gray-400">Availability</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">∞</div>
              <div className="text-gray-600 dark:text-gray-400">Automation</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 