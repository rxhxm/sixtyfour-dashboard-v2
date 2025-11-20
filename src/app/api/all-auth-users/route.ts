import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch ALL auth users (paginated)
    let allUsers: any[] = []
    let page = 1
    const maxPages = 2 // Limit to 2000 users for performance
    
    while (page <= maxPages) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ 
        page, 
        perPage: 1000 
      })
      
      if (!data.users || data.users.length === 0) break
      allUsers = [...allUsers, ...data.users]
      if (data.users.length < 1000) break
      page++
    }
    
    // Return just emails (for autocomplete)
    const emails = allUsers.map(u => u.email).filter(Boolean)
    
    console.log(`✅ Loaded ${emails.length} total auth user emails`)
    
    return NextResponse.json({ emails })
    
  } catch (error) {
    console.error('Error in all-auth-users API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

