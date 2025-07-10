import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware(req) {
    // This function runs for all protected routes
    console.log(`Protected route accessed: ${req.nextUrl.pathname}`)
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