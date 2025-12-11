import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { isAuthorizedEmail } from '@/lib/auth-guard'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error && data.session) {
      // Check if user is authorized
      if (!isAuthorizedEmail(data.session.user.email)) {
        // Sign out unauthorized users
        await supabase.auth.signOut()
        return NextResponse.redirect(`${origin}/auth/signin?error=unauthorized`)
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return to sign in with error
  return NextResponse.redirect(`${origin}/auth/signin?error=auth_failed`)
}

