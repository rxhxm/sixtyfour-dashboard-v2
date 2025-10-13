import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

// HARDCODED WHITELIST - ONLY THESE 3 CAN MANAGE ORG ACCESS
const AUTHORIZED_ADMINS = [
  'saarth@sixtyfour.ai',
  'roham@sixtyfour.ai',
  'chrisprice@sixtyfour.ai'
]

export async function POST(request: NextRequest) {
  try {
    // 1. VERIFY ADMIN ACCESS
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !AUTHORIZED_ADMINS.includes(user.email?.toLowerCase() || '')) {
      console.log('🚨 UNAUTHORIZED ORG MANAGEMENT ATTEMPT:', user?.email)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const { userEmail, orgId } = await request.json()
    
    console.log(`👤 Admin ${user.email} adding ${userEmail} to ${orgId}`)
    
    // 2. VALIDATE ORG EXISTS
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, "org-id"')
      .eq('org-id', orgId)
      .single()
    
    if (orgError || !org) {
      console.error('❌ Org validation failed:', orgId)
      return NextResponse.json({ 
        error: `Organization "${orgId}" does not exist in organizations table` 
      }, { status: 400 })
    }
    
    // 3. VALIDATE USER EXISTS & GET UUID
    let allUsers: any[] = []
    let page = 1
    
    while (true) {
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (!data.users || data.users.length === 0) break
      allUsers = [...allUsers, ...data.users]
      if (data.users.length < 1000) break
      page++
    }
    
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === userEmail.toLowerCase())
    
    if (!targetUser) {
      console.error('❌ User not found:', userEmail)
      return NextResponse.json({ 
        error: `User "${userEmail}" does not exist in auth system` 
      }, { status: 400 })
    }
    
    // 4. CHECK FOR DUPLICATE
    const { data: existing } = await supabaseAdmin
      .from('users-org')
      .select('*')
      .eq('id', targetUser.id)
      .eq('org_id', orgId)
      .single()
    
    if (existing) {
      return NextResponse.json({ 
        error: `${userEmail} already has access to ${orgId}` 
      }, { status: 400 })
    }
    
    // 5. INSERT MAPPING (SAFE - all validated!)
    const { error: insertError } = await supabaseAdmin
      .from('users-org')
      .insert({
        id: targetUser.id,
        org_id: orgId
      })
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      return NextResponse.json({ 
        error: 'Failed to add access' 
      }, { status: 500 })
    }
    
    // 6. LOG SUCCESS
    console.log(`✅ SUCCESS: ${userEmail} added to ${orgId} by ${user.email}`)
    
    // 7. CREATE AUDIT LOG ENTRY
    await supabaseAdmin
      .from('dashboard_audit_log')
      .insert({
        action: 'add_org_access',
        admin_email: user.email,
        target_email: userEmail,
        org_id: orgId,
        timestamp: new Date().toISOString()
      })
      .catch(e => console.warn('Audit log failed (non-critical):', e))
    
    return NextResponse.json({ 
      success: true,
      message: `Added ${userEmail} to ${orgId}`,
      user_id: targetUser.id,
      org_id: orgId
    })
    
  } catch (error) {
    console.error('Error in add-access API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

