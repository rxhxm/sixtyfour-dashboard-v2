import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hours = parseInt(searchParams.get('hours') || '24')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch recent auth users
    let allUsers: any[] = []
    let page = 1
    
    while (page <= 2) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (!data.users || data.users.length === 0) break
      allUsers = [...allUsers, ...data.users]
      if (data.users.length < 1000) break
      page++
    }
    
    // Filter to recent signups (last X hours)
    const cutoffTime = new Date(Date.now() - hours * 60 * 60 * 1000)
    const recentSignups = allUsers
      .filter(u => new Date(u.created_at) > cutoffTime)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    
    // Check org assignments
    const { data: orgMappings } = await supabaseAdmin
      .from('users-org')
      .select('id, org_id')
    
    const orgMap = new Map(orgMappings?.map((m: any) => [m.id, m.org_id]) || [])
    
    // Enrich with org info (explicit type fix)
    const enrichedSignups = recentSignups.map(user => ({
      email: user.email,
      id: user.id,
      created_at: user.created_at,
      org_id: orgMap.get(user.id) || null,
      needs_org: !orgMap.has(user.id)
    }))
    
    console.log(`📊 Found ${enrichedSignups.length} signups in last ${hours} hours`)
    
    return NextResponse.json({ 
      signups: enrichedSignups,
      total: enrichedSignups.length,
      unassigned: enrichedSignups.filter(s => s.needs_org).length
    })
    
  } catch (error) {
    console.error('Error in recent-signups API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


