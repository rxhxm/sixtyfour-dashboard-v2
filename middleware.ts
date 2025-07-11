import { withAuth } from "next-auth/middleware"
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    // This function runs for all protected routes
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const nextAuthSecret = process.env.NEXTAUTH_SECRET

    if (!nextAuthUrl) {
      console.error('🚨 FATAL: NEXTAUTH_URL environment variable is not set!')
      // In production, you might want to return a custom error page
    }

    if (!nextAuthSecret) {
      console.error('🚨 FATAL: NEXTAUTH_SECRET environment variable is not set!')
    }
    
    console.log(`🔐 Protected route accessed: ${req.nextUrl.pathname}`)
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token
    },
  }
)

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - /api/auth (NextAuth.js API routes)
     * - /auth (sign-in page)
     * - /_next/static (static files)
     * - /_next/image (image optimization files)
     * - /favicon.ico (favicon file)
     */
    '/((?!api/auth|auth|_next/static|_next/image|favicon.ico).*)',
  ],
} 