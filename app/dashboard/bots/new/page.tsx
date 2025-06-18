'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

export default function NewBotPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [formData, setFormData] = useState({
    name: '',
    telegram_token: '',
    telegram_bot_username: '',
    region_id: '',
    language_code: '',
    auto_post_enabled: true,
    push_notifications: true,
    max_posts_per_day: 10,
    preferred_post_times: ['09:00', '15:00', '21:00']
  })
  
  const [regions, setRegions] = useState<Region[]>([])
  const [languages, setLanguages] = useState<Language[]>([])
  const [loading, setLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [errors, setErrors] = useState<{[key: string]: string}>({})
  const [tokenValidated, setTokenValidated] = useState(false)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }
      setUser(user)
      loadData()
    }

    getUser()
  }, [supabase, router])

  const loadData = async () => {
    try {
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
    } catch (error) {
      console.error('Error loading data:', error)
      setErrors({ general: 'Failed to load regions and languages. Please try again.' })
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
      newErrors.telegram_token = 'Invalid token format'
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
      // Get current user's manager record
      const { data: managerData, error: managerError } = await supabase
        .from('managers')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (managerError) {
        throw new Error('Manager profile not found. Please contact support.')
      }

      // Encrypt the token (in production, this should be done server-side)
      const encryptedToken = btoa(formData.telegram_token) // Simple encoding for demo

      // Create the bot
      const { data: botData, error: botError } = await supabase
        .from('bots')
        .insert({
          manager_id: managerData.id,
          name: formData.name,
          telegram_token_encrypted: encryptedToken,
          telegram_bot_username: formData.telegram_bot_username,
          region_id: formData.region_id,
          language_code: formData.language_code,
          auto_post_enabled: formData.auto_post_enabled,
          push_notifications: formData.push_notifications,
          max_posts_per_day: formData.max_posts_per_day,
          preferred_post_times: formData.preferred_post_times
        })
        .select()
        .single()

      if (botError) throw botError

      // Show success message and redirect
      alert('Bot created successfully!')
      router.push('/dashboard')
    } catch (error: any) {
      console.error('Error creating bot:', error)
      setErrors({ general: error.message || 'Error creating bot. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (dataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <span className="mr-2">←</span>
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">New Bot</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create a new Telegram bot with custom settings
          </p>
        </div>

        {/* Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          {errors.general && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-4 py-3 rounded-lg">
              {errors.general}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Basic Information
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.name ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="e.g: Ethiopia Sports Bot"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Token (from BotFather) *
                </label>
                <input
                  type="password"
                  value={formData.telegram_token}
                  onChange={(e) => handleInputChange('telegram_token', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.telegram_token ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
                />
                {tokenValidated && (
                  <p className="text-green-500 text-sm mt-1">✓ Valid token format</p>
                )}
                {errors.telegram_token && <p className="text-red-500 text-sm mt-1">{errors.telegram_token}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Bot Username
                </label>
                <input
                  type="text"
                  value={formData.telegram_bot_username}
                  onChange={(e) => handleInputChange('telegram_bot_username', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="@your_bot_username"
                />
              </div>
            </div>

            {/* Region and Language */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Region & Language
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Region *
                </label>
                <select
                  value={formData.region_id}
                  onChange={(e) => handleInputChange('region_id', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.region_id ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select a region</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.flag_emoji} {region.name}
                    </option>
                  ))}
                </select>
                {errors.region_id && <p className="text-red-500 text-sm mt-1">{errors.region_id}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Language *
                </label>
                <select
                  value={formData.language_code}
                  onChange={(e) => handleInputChange('language_code', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.language_code ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select a language</option>
                  {languages.map((language) => (
                    <option key={language.code} value={language.code}>
                      {language.name} ({language.native_name})
                    </option>
                  ))}
                </select>
                {errors.language_code && <p className="text-red-500 text-sm mt-1">{errors.language_code}</p>}
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                Bot Settings
              </h2>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="auto_post"
                  checked={formData.auto_post_enabled}
                  onChange={(e) => handleInputChange('auto_post_enabled', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="auto_post" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable automatic posting
                </label>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="push_notifications"
                  checked={formData.push_notifications}
                  onChange={(e) => handleInputChange('push_notifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="push_notifications" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Enable push notifications
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Maximum posts per day (1-50)
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.max_posts_per_day}
                  onChange={(e) => handleInputChange('max_posts_per_day', parseInt(e.target.value))}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white ${
                    errors.max_posts_per_day ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                {errors.max_posts_per_day && <p className="text-red-500 text-sm mt-1">{errors.max_posts_per_day}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preferred posting times
                </label>
                <div className="space-y-2">
                  {formData.preferred_post_times.map((time, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => handleTimeChange(index, e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                      {formData.preferred_post_times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                  {formData.preferred_post_times.length < 6 && (
                    <button
                      type="button"
                      onClick={addTimeSlot}
                      className="text-blue-500 hover:text-blue-700 text-sm"
                    >
                      + Add time slot
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center"
              >
                {loading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>}
                {loading ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 