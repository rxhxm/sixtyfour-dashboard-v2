import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch all user-org mappings
    const { data: userOrgs, error } = await supabaseAdmin
      .from('users-org')
      .select('id, org_id, created_at')
    
    if (error) {
      console.error('Error fetching users-org:', error)
      return NextResponse.json({ error: 'Failed to fetch mappings' }, { status: 500 })
    }
    
    // Get all auth users to map IDs to emails
    let allUsers: any[] = []
    let page = 1
    
    while (page <= 2) { // Limit to 2 pages for speed
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (!data.users || data.users.length === 0) break
      allUsers = [...allUsers, ...data.users]
      if (data.users.length < 1000) break
      page++
    }
    
    // Create enriched mappings with email
    const enrichedMappings = userOrgs?.map((mapping: any) => {
      const user = allUsers.find(u => u.id === mapping.id)
      return {
        userId: mapping.id,
        orgId: mapping.org_id,
        email: user?.email || 'Unknown',
        createdAt: mapping.created_at
      }
    }).filter((m: any) => m.email !== 'Unknown') || []
    
    console.log(`✅ Loaded ${enrichedMappings.length} org access mappings`)
    
    return NextResponse.json({ mappings: enrichedMappings })
    
  } catch (error) {
    console.error('Error in mappings API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

