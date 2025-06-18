'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface Region {
  id: string
  name: string
  flag_emoji: string
  primary_language: string
}

interface Language {
  code: string
  name: string
  native_name: string
}

interface Bot {
  id: string
  name: string
  telegram_token_encrypted: string
  telegram_bot_username: string | null
  region_id: string
  language_code: string
  auto_post_enabled: boolean
  push_notifications: boolean
  max_posts_per_day: number
  preferred_post_times: string[]
  tone: string
  is_active: boolean
}

export default function EditBotPage() {
  const router = useRouter()
  const params = useParams()
  const botId = params.id as string
  const supabase = createClientComponentClient()
  
  const [bot, setBot] = useState<Bot | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    telegram_token: '',
    telegram_bot_username: '',
    region_id: '',
    language_code: '',
    auto_post_enabled: true,
    push_notifications: true,
    max_posts_per_day: 10,
    preferred_post_times: ['09:00', '15:00', '21:00'],
    tone: 'friendly',
    is_active: true
  })
  
  const [regions, setRegions] = useState<Region[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [tokenValidated, setTokenValidated] = useState(true)
  const [user, setUser] = useState<any>(null)

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
        .select('*')
        .eq('id', botId)
        .eq('manager_id', managerData.id)
        .single()

      if (botError) {
        throw new Error('Bot not found or you do not have permission to edit it')
      }

      // Decrypt token (simple decoding for demo - in production use proper encryption)
      const decryptedToken = atob(botData.telegram_token_encrypted)

      setBot(botData)
      setFormData({
        name: botData.name,
        telegram_token: decryptedToken,
        telegram_bot_username: botData.telegram_bot_username || '',
        region_id: botData.region_id,
        language_code: botData.language_code,
        auto_post_enabled: botData.auto_post_enabled,
        push_notifications: botData.push_notifications,
        max_posts_per_day: botData.max_posts_per_day,
        preferred_post_times: botData.preferred_post_times || ['09:00', '15:00', '21:00'],
        tone: botData.tone || 'friendly',
        is_active: botData.is_active
      })

      // Load regions
      const { data: regionsData, error: regionsError } = await supabase
        .from('regions')
        .select('id, name, flag_emoji, primary_language')
        .eq('is_active', true)
        .order('name')

      if (regionsError) throw regionsError

      // Load languages
      const { data: languagesData, error: languagesError } = await supabase
        .from('languages')
        .select('code, name, native_name')
        .eq('is_active', true)
        .order('name')

      if (languagesError) throw languagesError

      setRegions(regionsData || [])
      setLanguages(languagesData || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      setErrors({ general: error.message || 'Error loading data' })
    } finally {
      setDataLoading(false)
    }
  }

  const validateTelegramToken = (token: string): boolean => {
    const tokenRegex = /^\d{8,10}:[a-zA-Z0-9_-]{35}$/
    return tokenRegex.test(token)
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }

    // Validate token in real-time
    if (field === 'telegram_token') {
      setTokenValidated(validateTelegramToken(value))
    }
  }

  const handleTimeChange = (index: number, value: string) => {
    const newTimes = [...formData.preferred_post_times]
    newTimes[index] = value
    setFormData(prev => ({ ...prev, preferred_post_times: newTimes }))
  }

  const addTimeSlot = () => {
    if (formData.preferred_post_times.length < 6) {
      setFormData(prev => ({
        ...prev,
        preferred_post_times: [...prev.preferred_post_times, '12:00']
      }))
    }
  }

  const removeTimeSlot = (index: number) => {
    if (formData.preferred_post_times.length > 1) {
      const newTimes = formData.preferred_post_times.filter((_, i) => i !== index)
      setFormData(prev => ({ ...prev, preferred_post_times: newTimes }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Bot name is required'
    }

    if (!formData.telegram_token.trim()) {
      newErrors.telegram_token = 'Bot token is required'
    } else if (!validateTelegramToken(formData.telegram_token)) {
      newErrors.telegram_token = 'Token format is invalid'
    }

    if (!formData.region_id) {
      newErrors.region_id = 'Please select a region'
    }

    if (!formData.language_code) {
      newErrors.language_code = 'Please select a language'
    }

    if (formData.max_posts_per_day < 1 || formData.max_posts_per_day > 50) {
      newErrors.max_posts_per_day = 'Posts per day must be between 1 and 50'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      // Encrypt the token (in production, this should be done server-side)
      const encryptedToken = btoa(formData.telegram_token)

      // Update the bot
      const { error: botError } = await supabase
        .from('bots')
        .update({
          name: formData.name,
          telegram_token_encrypted: encryptedToken,
          telegram_bot_username: formData.telegram_bot_username || null,
          region_id: formData.region_id,
          language_code: formData.language_code,
          auto_post_enabled: formData.auto_post_enabled,
          push_notifications: formData.push_notifications,
          max_posts_per_day: formData.max_posts_per_day,
          preferred_post_times: formData.preferred_post_times,
          tone: formData.tone,
          is_active: formData.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', botId)

      if (botError) throw botError

      router.push('/dashboard/bots')
    } catch (error: any) {
      console.error('Error updating bot:', error)
      setErrors({ general: error.message || 'Error updating bot' })
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading bot data...</p>
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
            The requested bot was not found or you do not have permission to edit it
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
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                ✏️ Edit Bot: {bot.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Update bot settings and operations
              </p>
            </div>
            
            <div className="flex gap-3">
              <Link
                href="/dashboard/bots"
                className="px-4 py-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.general && (
            <div className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
              <div className="flex">
                <div className="text-red-400">⚠️</div>
                <div className="mr-3">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    {errors.general}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                📝 Basic Information
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bot Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="Your bot name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Telegram Username
                  </label>
                  <input
                    type="text"
                    value={formData.telegram_bot_username}
                    onChange={(e) => handleInputChange('telegram_bot_username', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="my_awesome_bot"
                  />
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Without @ - just the username
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Token *
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={formData.telegram_token}
                    onChange={(e) => handleInputChange('telegram_token', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.telegram_token ? 'border-red-500' : 
                      tokenValidated ? 'border-green-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                    placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {tokenValidated ? (
                      <span className="text-green-500">✅</span>
                    ) : (
                      <span className="text-red-500">❌</span>
                    )}
                  </div>
                </div>
                {errors.telegram_token && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.telegram_token}</p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Get from @BotFather on Telegram
                </p>
              </div>
            </div>
          </div>

          {/* Regional Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🌍 Regional Settings
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Active Region *
                  </label>
                  <select
                    value={formData.region_id}
                    onChange={(e) => handleInputChange('region_id', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.region_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select region...</option>
                    {regions.map((region) => (
                      <option key={region.id} value={region.id}>
                        {region.flag_emoji} {region.name}
                      </option>
                    ))}
                  </select>
                  {errors.region_id && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.region_id}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Primary Language *
                  </label>
                  <select
                    value={formData.language_code}
                    onChange={(e) => handleInputChange('language_code', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.language_code ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    <option value="">Select language...</option>
                    {languages.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.native_name} ({language.name})
                      </option>
                    ))}
                  </select>
                  {errors.language_code && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.language_code}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Bot Behavior */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                🤖 Bot Behavior
              </h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Communication Tone
                  </label>
                  <select
                    value={formData.tone}
                    onChange={(e) => handleInputChange('tone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="professional">Professional</option>
                    <option value="funny">Humorous</option>
                    <option value="energetic">Energetic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Posts Per Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    value={formData.max_posts_per_day}
                    onChange={(e) => handleInputChange('max_posts_per_day', parseInt(e.target.value))}
                    className={`w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.max_posts_per_day ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  {errors.max_posts_per_day && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.max_posts_per_day}</p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="auto_post_enabled"
                    checked={formData.auto_post_enabled}
                    onChange={(e) => handleInputChange('auto_post_enabled', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="auto_post_enabled" className="mr-2 block text-sm text-gray-900 dark:text-white">
                    Auto-posting Enabled
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="push_notifications"
                    checked={formData.push_notifications}
                    onChange={(e) => handleInputChange('push_notifications', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="push_notifications" className="mr-2 block text-sm text-gray-900 dark:text-white">
                    Instant Notifications for Hot Events
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => handleInputChange('is_active', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="is_active" className="mr-2 block text-sm text-gray-900 dark:text-white">
                    Bot Active
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Posting Schedule */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                ⏰ Posting Schedule
              </h3>
            </div>
            <div className="p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Preferred Posting Times
                </label>
                <div className="space-y-2">
                  {formData.preferred_post_times.map((time, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      {formData.preferred_post_times.length > 1 && (
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
                  {formData.preferred_post_times.length < 6 && (
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1"
                    >
                      + Add Time Slot
                    </button>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  The bot will post automatically at these times (according to selected region timezone)
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-3 pt-6">
            <Link
              href="/dashboard/bots"
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </>
              ) : (
                <>
                  💾 Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 