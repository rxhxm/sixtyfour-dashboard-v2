// Middleware to protect ALL API routes with email whitelist
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const AUTHORIZED_EMAILS = [
  'saarth@sixtyfour.ai',
  'roham@sixtyfour.ai',
  'chrisprice@sixtyfour.ai'
]

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
    
    const email = user.email?.toLowerCase()
    
    if (!email || !AUTHORIZED_EMAILS.includes(email)) {
      console.log('🚨 API: Unauthorized email:', email)
      return NextResponse.json(
        { error: 'Unauthorized - Access denied' },
        { status: 403 }
      )
    }
    
    console.log('✅ API: Authorized access:', email)
    return null // Auth passed, continue
    
  } catch (error) {
    console.error('API auth check failed:', error)
    return NextResponse.json(
      { error: 'Authentication error' },
      { status: 500 }
    )
  }
}

