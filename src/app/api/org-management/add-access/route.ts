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
  const requestId = Math.random().toString(36).substring(7)
  console.log(`\n${'='.repeat(70)}`)
  console.log(`🔵 ORG ACCESS ADD REQUEST [${requestId}] STARTED`)
  console.log(`Time: ${new Date().toISOString()}`)
  console.log('='.repeat(70))
  
  try {
    // 1. VERIFY ADMIN ACCESS
    console.log(`[${requestId}] Step 1: Verifying admin access...`)
    
    let supabase
    try {
      supabase = await createClient()
      console.log(`[${requestId}]   ✓ Supabase client created`)
    } catch (e: any) {
      console.error(`[${requestId}]   ✗ Failed to create Supabase client:`, e.message)
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 })
    }
    
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    console.log(`[${requestId}]   User: ${user?.email || 'NONE'}`)
    console.log(`[${requestId}]   Error: ${userError?.message || 'NONE'}`)
    
    if (!user || !AUTHORIZED_ADMINS.includes(user.email?.toLowerCase() || '')) {
      console.log(`[${requestId}]   ✗ UNAUTHORIZED:`, user?.email)
      return NextResponse.json({ error: 'Unauthorized - admin only' }, { status: 403 })
    }
    console.log(`[${requestId}]   ✓ Admin authorized`)
    
    const body = await request.json()
    const { userEmail, orgId } = body
    
    console.log(`[${requestId}] Step 2: Request validated`)
    console.log(`[${requestId}]   Email: ${userEmail}`)
    console.log(`[${requestId}]   Org: ${orgId}`)
    
    // 2. VALIDATE ORG EXISTS (case-insensitive for flexibility)
    console.log('Step 3: Validating org exists in organizations table...')
    
    const { data: orgsMatch, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id, "org-id"')
      .ilike('org-id', orgId) // Case-insensitive match
    
    console.log('Org query result:', { matches: orgsMatch?.length, error: orgError?.message })
    
    if (orgError || !orgsMatch || orgsMatch.length === 0) {
      console.error('❌ VALIDATION FAILED: Org not found:', orgId)
      return NextResponse.json({ 
        error: `Organization "${orgId}" does not exist in database` 
      }, { status: 400 })
    }
    
    // Use the exact org-id from database (correct case)
    const validatedOrgId = orgsMatch[0]['org-id']
    console.log('✅ Org validated:', validatedOrgId, '(using exact case from DB)')
    
    // 3. VALIDATE USER EXISTS & GET UUID (with timeout protection)
    console.log('Step 4: Fetching auth users...')
    
    let allUsers: any[] = []
    let page = 1
    const maxPages = 2 // Limit to prevent timeout (gets 2000 users max)
    
    try {
      while (page <= maxPages) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
        if (!data.users || data.users.length === 0) break
        allUsers = [...allUsers, ...data.users]
        if (data.users.length < 1000) break
        page++
      }
      
      console.log(`Loaded ${allUsers.length} users`)
    } catch (userFetchError: any) {
      console.error('❌ Failed to fetch users:', userFetchError.message)
      return NextResponse.json({ 
        error: 'Failed to fetch user list from auth system' 
      }, { status: 500 })
    }
    
    const targetUser = allUsers.find(u => u.email?.toLowerCase() === userEmail.toLowerCase())
    
    if (!targetUser) {
      console.error('❌ User not found:', userEmail, '(checked', allUsers.length, 'users)')
      return NextResponse.json({ 
        error: `User "${userEmail}" not found. Try exact email from suggestions.` 
      }, { status: 400 })
    }
    
    console.log('✅ User found:', targetUser.email)
    
    // 4. CHECK FOR EXISTING MAPPING
    // IMPORTANT: id is PRIMARY KEY - each user can only be in ONE org!
    const { data: existing } = await supabaseAdmin
      .from('users-org')
      .select('*')
      .eq('id', targetUser.id)
      .maybeSingle()  // Use maybeSingle() to avoid error if not found
    
    if (existing) {
      if (existing.org_id === validatedOrgId) {
        console.log('⚠️ User already has access to this org')
        return NextResponse.json({ 
          error: `${userEmail} already has access to ${validatedOrgId}` 
        }, { status: 409 })
      } else {
        console.log('⚠️ User already mapped to different org:', existing.org_id)
        return NextResponse.json({ 
          error: `${userEmail} is already mapped to organization "${existing.org_id}". Each user can only be in one organization. Remove the existing mapping first.` 
        }, { status: 409 })
      }
    }
    
    // 5. INSERT MAPPING (SAFE - all validated!)
    console.log('Step 6: Inserting into users-org...')
    
    const { error: insertError } = await supabaseAdmin
      .from('users-org')
      .insert({
        id: targetUser.id,
        org_id: validatedOrgId // Correct column name: org_id (with underscore)
      })
    
    console.log('Insert result:', insertError ? `Error: ${insertError.message}` : 'Success')
    
    if (insertError) {
      console.error('❌ Insert failed:', insertError)
      return NextResponse.json({ 
        error: 'Failed to add access' 
      }, { status: 500 })
    }
    
    // 6. LOG SUCCESS
    console.log(`✅ SUCCESS: ${userEmail} added to ${orgId} by ${user.email}`)
    
    // 7. CREATE AUDIT LOG ENTRY (if table exists)
    try {
      await supabaseAdmin
        .from('dashboard_audit_log')
        .insert({
          action: 'add_org_access',
          admin_email: user.email,
          target_email: userEmail,
          org_id: orgId,
          timestamp: new Date().toISOString()
        })
    } catch (auditError: any) {
      // Audit table might not exist - that's OK, log to console
      console.log('📝 Audit log:', user.email, 'added', userEmail, 'to', orgId)
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Added ${userEmail} to ${orgId}`,
      user_id: targetUser.id,
      org_id: orgId
    })
    
  } catch (error: any) {
    console.error(`\n${'!'.repeat(70)}`)
    console.error(`❌ FATAL ERROR in add-access API [${requestId || 'unknown'}]`)
    console.error('Error:', error)
    console.error('Message:', error.message)
    console.error('Stack:', error.stack)
    console.error('!'.repeat(70))
    
    return NextResponse.json({ 
      error: `Server error: ${error.message || 'Unknown'}. Check logs for request ID: ${requestId}`
    }, { status: 500 })
  }
}

