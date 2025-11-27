import { NextRequest, NextResponse } from 'next/server'
import { checkDashboardAccess, updateLastLogin } from '@/lib/supabase-auth'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ hasAccess: false, error: 'Email required' }, { status: 400 })
    }
    
    const hasAccess = await checkDashboardAccess(email)
    
    if (hasAccess) {
      // Update last login timestamp
      await updateLastLogin(email)
    }
    
    return NextResponse.json({ hasAccess })
  } catch (error) {
    console.error('Error checking access:', error)
    return NextResponse.json({ hasAccess: false, error: 'Server error' }, { status: 500 })
  }
}

