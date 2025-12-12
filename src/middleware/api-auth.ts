// Middleware to protect ALL API routes with email whitelist
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isAuthorizedEmail } from '@/lib/auth-guard'

export async function checkApiAuth(request: NextRequest): Promise<NextResponse | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      console.log('🚫 API: No user session')
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      )
    }
    
    if (!isAuthorizedEmail(user.email)) {
      console.log('🚨 API: Unauthorized email:', user.email)
      return NextResponse.json(
        { error: 'Unauthorized - Access denied' },
        { status: 403 }
      )
    }
    
    console.log('✅ API: Authorized access:', user.email)
    return null // Auth passed, continue
    
  } catch (error) {
    console.error('API auth check failed:', error)
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}

