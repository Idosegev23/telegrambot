'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Manager {
  id: string
  email: string
  name: string
  role: string
  preferred_language: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
  bots_count?: number
}

export default function AdminPage() {
  const [managers, setManagers] = useState<Manager[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newManager, setNewManager] = useState({
    email: '',
    name: '',
    password: '',
    preferred_language: 'en'
  })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    checkAdminAccess()
    if (isAdmin) {
      loadManagers()
    }
  }, [isAdmin])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      const { data: manager } = await supabase
        .from('managers')
        .select('role')
        .eq('user_id', user.id)
        .single()

      if (manager?.role !== 'super_admin') {
        router.push('/dashboard')
        return
      }

      setIsAdmin(true)
    } catch (error) {
      console.error('Error checking admin access:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('managers')
        .select(`
          *,
          bots:bots(count)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const managersWithBotCount = data?.map(manager => ({
        ...manager,
        bots_count: manager.bots?.[0]?.count || 0
      })) || []

      setManagers(managersWithBotCount)
    } catch (error) {
      console.error('Error loading managers:', error)
    }
  }

  const createManager = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setError('')

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: newManager.email,
        password: newManager.password,
        email_confirm: true
      })

      if (authError) throw authError

      // Create manager profile
      const { error: managerError } = await supabase
        .from('managers')
        .insert({
          user_id: authData.user.id,
          email: newManager.email,
          name: newManager.name,
          preferred_language: newManager.preferred_language,
          role: 'manager'
        })

      if (managerError) throw managerError

      setNewManager({ email: '', name: '', password: '', preferred_language: 'en' })
      setShowCreateForm(false)
      loadManagers()
      
    } catch (error: any) {
      setError(error.message)
    } finally {
      setCreating(false)
    }
  }

  const toggleManagerStatus = async (managerId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('managers')
        .update({ is_active: !currentStatus })
        .eq('id', managerId)

      if (error) throw error
      loadManagers()
    } catch (error) {
      console.error('Error updating manager status:', error)
    }
  }

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

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-6">You don't have permission to access this page.</p>
          <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-600">Manage TriRoars bot managers</p>
          </div>
          <div className="flex gap-4">
            <Link 
              href="/dashboard"
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg"
            >
              Back to Dashboard
            </Link>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              + Create Manager
            </button>
          </div>
        </div>

        {showCreateForm && (
          <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
            <h2 className="text-xl font-semibold mb-4">Create New Manager</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}
            <form onSubmit={createManager} className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={newManager.name}
                  onChange={(e) => setNewManager(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={newManager.email}
                  onChange={(e) => setNewManager(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temporary Password
                </label>
                <input
                  type="password"
                  value={newManager.password}
                  onChange={(e) => setNewManager(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preferred Language
                </label>
                <select
                  value={newManager.preferred_language}
                  onChange={(e) => setNewManager(prev => ({ ...prev, preferred_language: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="am">Amharic</option>
                  <option value="sw">Swahili</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg"
                >
                  {creating ? 'Creating...' : 'Create Manager'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-2 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Managers ({managers.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Bots
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {managers.map((manager) => (
                  <tr key={manager.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{manager.name}</div>
                        <div className="text-sm text-gray-500">{manager.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        manager.role === 'super_admin' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {manager.role === 'super_admin' ? 'Super Admin' : 'Manager'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {manager.bots_count || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {manager.last_login_at 
                        ? new Date(manager.last_login_at).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        manager.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {manager.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {manager.role !== 'super_admin' && (
                        <button
                          onClick={() => toggleManagerStatus(manager.id, manager.is_active)}
                          className={`${
                            manager.is_active 
                              ? 'text-red-600 hover:text-red-900' 
                              : 'text-green-600 hover:text-green-900'
                          }`}
                        >
                          {manager.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
} 