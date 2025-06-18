import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient, createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// עבור Server Components
export const createServerSupabaseClient = () => {
  const cookieStore = cookies()
  return createServerComponentClient({
    cookies: () => cookieStore,
  })
}

// עבור Client Components
export const createClientSupabaseClient = () => {
  return createClientComponentClient()
}

// עבור API Routes ו-Server Actions
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// עבור Client-side (public)
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export type { Database } from '@/types/database' 