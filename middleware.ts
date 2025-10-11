import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // Refresh session if expired - required for Server Components
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes
  const protectedRoutes = ['/', '/workflows', '/credits-management']
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname === route || req.nextUrl.pathname.startsWith(route + '/')
  )

  // If accessing a protected route without a session, redirect to signin
  if (isProtectedRoute && !session) {
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
      
      const { hasAccess } = await checkResponse.json()
      
      if (!hasAccess) {
        // User authenticated but no dashboard access - sign them out and redirect
        await supabase.auth.signOut()
        const redirectUrl = req.nextUrl.clone()
        redirectUrl.pathname = '/auth/signin'
        redirectUrl.searchParams.set('error', 'no-access')
        return NextResponse.redirect(redirectUrl)
      }
    } catch (error) {
      console.error('Error checking dashboard access in middleware:', error)
      // On error, allow through (fail open for now)
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
    '/auth/signin',
    '/api/:path*'
  ]
}

