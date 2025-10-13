import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch users-org mapping
    const { data: userOrgs, error: userOrgsError } = await supabaseAdmin
      .from('users-org')
      .select('id, org_id')
    
    if (userOrgsError) {
      console.error('Error fetching users-org:', userOrgsError)
      return NextResponse.json({ error: 'Failed to fetch user-org mapping' }, { status: 500 })
    }
    
    // Fetch all Supabase Auth users
    const { data: { users }, error: authError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error fetching auth users:', authError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }
    
    // Create mapping: org_id -> email
    const orgEmailMap: Record<string, string> = {}
    
    userOrgs?.forEach((userOrg: any) => {
      // Find the auth user for this user_id
      const authUser = users?.find((u: any) => u.id === userOrg.id)
      if (authUser?.email && userOrg.org_id) {
        orgEmailMap[userOrg.org_id] = authUser.email
      }
    })
    
    console.log('✅ Mapped', Object.keys(orgEmailMap).length, 'orgs to emails')
    
    return NextResponse.json({ emailMap: orgEmailMap })
    
  } catch (error) {
    console.error('Error in org-emails API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

