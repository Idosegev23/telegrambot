import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (error) {
        console.error('Auth callback error:', error)
        return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent(error.message)}`)
      }

      if (data.user) {
        // First check if manager profile exists by user_id
        let { data: managerData, error: managerError } = await supabase
          .from('managers')
          .select('id, role')
          .eq('user_id', data.user.id)
          .single()

        // If no manager found by user_id, try to find by email and link them
        if (managerError && managerError.code === 'PGRST116') {
          console.log('Looking for manager by email:', data.user.email)
          
          const { data: managerByEmail, error: emailError } = await supabase
            .from('managers')
            .select('id, role, user_id')
            .eq('email', data.user.email)
            .single()

          console.log('Manager found by email:', managerByEmail)

          if (managerByEmail && !managerByEmail.user_id) {
            console.log('Linking user to manager...')
            // Update the manager record to link it with the auth user
            const { error: updateError } = await supabase
              .from('managers')
              .update({ user_id: data.user.id })
              .eq('id', managerByEmail.id)

            if (!updateError) {
              managerData = managerByEmail
              console.log('Successfully linked user to manager')
            } else {
              console.error('Error linking user to manager:', updateError)
            }
          } else if (managerByEmail) {
            console.log('Manager already has user_id:', managerByEmail.user_id)
            managerData = managerByEmail
          }
        }

        // If still no manager found, redirect to login with error
        if (!managerData) {
          await supabase.auth.signOut()
          return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=${encodeURIComponent('Account not found. Please contact TriRoars team for account setup.')}`)
        }
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    } catch (error) {
      console.error('Unexpected error in auth callback:', error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/login?error=unexpected_error`)
    }
  }

  // No code parameter, redirect to login
  return NextResponse.redirect(`${requestUrl.origin}/auth/login`)
} 