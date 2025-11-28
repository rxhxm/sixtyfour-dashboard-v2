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
    
    // Fetch ALL Supabase Auth users (with pagination!)
    let allUsers: any[] = []
    let page = 1
    const perPage = 1000
    
    while (true) {
      const { data, error: authError } = await supabaseAdmin.auth.admin.listUsers({
        page: page,
        perPage: perPage
      })
      
      if (authError) {
        console.error('Error fetching auth users:', authError)
        break
      }
      
      if (!data.users || data.users.length === 0) {
        break
      }
      
      allUsers = [...allUsers, ...data.users]
      
      if (data.users.length < perPage) {
        break // Last page
      }
      
      page++
    }
    
    console.log(`✅ Loaded ${allUsers.length} total auth users (was only loading 50 before!)`)
    
    // Create mapping: org_id -> email
    const orgEmailMap: Record<string, string> = {}
    
    // Create list of ALL unique emails
    const allEmails: string[] = allUsers
      .map((u: any) => u.email)
      .filter((email: any) => email && typeof email === 'string')
    
    userOrgs?.forEach((userOrg: any) => {
      // Find the auth user for this user_id
      const authUser = allUsers?.find((u: any) => u.id === userOrg.id)
      if (authUser?.email && userOrg.org_id) {
        orgEmailMap[userOrg.org_id] = authUser.email
      }
    })
    
    console.log('✅ Mapped', Object.keys(orgEmailMap).length, 'orgs to emails')
    console.log('✅ Found', allEmails.length, 'total user emails')
    
    return NextResponse.json({ 
      emailMap: orgEmailMap,
      allEmails: allEmails 
    })
    
  } catch (error) {
    console.error('Error in org-emails API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

