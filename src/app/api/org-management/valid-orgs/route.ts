import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch ALL valid org-ids from organizations table (source of truth)
    const { data: orgs, error } = await supabaseAdmin
      .from('organizations')
      .select('id, "org-id"')
      .order('org-id', { ascending: true })
    
    if (error) {
      console.error('Error fetching organizations:', error)
      return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
    }
    
    const validOrgIds = orgs?.map(o => o['org-id']).filter(Boolean) || []
    
    console.log(`✅ Loaded ${validOrgIds.length} valid org-ids`)
    
    return NextResponse.json({ 
      orgs: validOrgIds,
      count: validOrgIds.length 
    })
    
  } catch (error) {
    console.error('Error in valid-orgs API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

