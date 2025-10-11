import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  console.log('🔒 MIDDLEWARE RUNNING for:', req.nextUrl.pathname)
  
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()
  
  console.log('🔍 Session check:', session ? `User: ${session.user.email}` : 'No session')

  // Protected routes
  const protectedRoutes = ['/', '/workflows', '/credits-management', '/platform-access']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route + '/')
  )
  
  console.log('🔐 Protected route?', isProtectedRoute, 'Path:', req.nextUrl.pathname)

  // If accessing a protected route without a session, redirect to signin
  if (isProtectedRoute && !session) {
    console.log('🚫 NO SESSION - Redirecting to signin')
    const redirectUrl = req.nextUrl.clone()
    redirectUrl.pathname = '/auth/signin'
    redirectUrl.searchParams.set('redirectedFrom', req.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user has a session, check if they have dashboard access
  if (session && isProtectedRoute) {
    try {
      // Check dashboard access
      const checkResponse = await fetch(`${req.nextUrl.origin}/api/auth/check-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: session.user.email })
      })
      
      if (!checkResponse.ok) {
        // Access check failed - DENY ACCESS
        console.error('Access check API failed, denying access')
        await supabase.auth.signOut()
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/auth/signin'
        redirectUrl.searchParams.set('error', 'access-check-failed')
        return NextResponse.redirect(redirectUrl)
      }
      
      const { hasAccess } = await checkResponse.json()
      
      if (!hasAccess) {
        // User authenticated but no dashboard access - sign them out and redirect
        console.log('User does not have dashboard access:', session.user.email)
        await supabase.auth.signOut()
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/auth/signin'
        redirectUrl.searchParams.set('error', 'no-access')
        return NextResponse.redirect(redirectUrl)
      }
      
      console.log('✅ Access granted to:', session.user.email)
    } catch (error) {
      console.error('Error checking dashboard access in middleware:', error)
      // SECURITY: Fail CLOSED - deny access on error
      await supabase.auth.signOut()
      const redirectUrl = req.nextUrl.clone()
      redirectUrl.pathname = '/auth/signin'
      redirectUrl.searchParams.set('error', 'security-error')
      return NextResponse.redirect(redirectUrl)
    }
  }

  // If signed in and trying to access signin page, redirect to dashboard
  if (session && req.nextUrl.pathname === '/auth/signin') {
    return NextResponse.redirect(new URL('/', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/',
    '/workflows',
    '/credits-management',
    '/platform-access',
    '/auth/signin',
    '/api/:path*'
  ]
}

