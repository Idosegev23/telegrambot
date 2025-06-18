import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const res = NextResponse.next()
  
  try {
    const supabase = createMiddlewareClient({ req: request, res })
    
    // Only get session for specific routes to avoid unnecessary calls
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Middleware auth error:', error)
      // Don't redirect on auth errors, let the app handle it
      return res
    }

    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')
    const isDashboardRoute = request.nextUrl.pathname.startsWith('/dashboard')
    const isHomePage = request.nextUrl.pathname === '/'

    // If user is not signed in and trying to access dashboard, redirect to login
    if (!session && isDashboardRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/auth/login'
      return NextResponse.redirect(redirectUrl)
    }

    // If user is signed in and trying to access auth pages, redirect to dashboard
    if (session && isAuthRoute) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }

    // Allow home page access for everyone
    return res
  } catch (error) {
    console.error('Middleware error:', error)
    // On any error, just continue without redirecting
    return res
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes
     */
    '/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 