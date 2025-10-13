import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 30

const AUTHORIZED_ADMINS = [
  'saarth@sixtyfour.ai',
  'roham@sixtyfour.ai',
  'chrisprice@sixtyfour.ai'
]

export async function DELETE(request: NextRequest) {
  try {
    // 1. VERIFY ADMIN ACCESS
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !AUTHORIZED_ADMINS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    const { userId, orgId } = await request.json()
    
    console.log(`👤 Admin ${user.email} removing user ${userId} from ${orgId}`)
    
    // 2. DELETE MAPPING
    const { error: deleteError } = await supabaseAdmin
      .from('users-org')
      .delete()
      .eq('id', userId)
      .eq('org_id', orgId)
    
    if (deleteError) {
      console.error('❌ Delete failed:', deleteError)
      return NextResponse.json({ error: 'Failed to remove access' }, { status: 500 })
    }
    
    console.log(`✅ SUCCESS: Removed user from ${orgId}`)
    
    // 3. AUDIT LOG
    await supabaseAdmin
      .from('dashboard_audit_log')
      .insert({
        action: 'remove_org_access',
        admin_email: user.email,
        target_user_id: userId,
        org_id: orgId,
        timestamp: new Date().toISOString()
      })
      .catch(e => console.warn('Audit log failed:', e))
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in remove-access API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

