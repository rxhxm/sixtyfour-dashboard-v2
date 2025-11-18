import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

export const runtime = 'nodejs'
export const maxDuration = 30

// Input validation schema
const RemoveAccessSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
  orgId: z.string()
    .min(1, 'Organization ID required')
    .max(255, 'Organization ID too long')
})

const AUTHORIZED_ADMINS = [
  'saarth@sixtyfour.ai',
  'roham@sixtyfour.ai',
  'chrisprice@sixtyfour.ai',
  'erik@sixtyfour.ai'
]

export async function DELETE(request: NextRequest) {
  try {
    // 1. VERIFY ADMIN ACCESS
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user || !AUTHORIZED_ADMINS.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    
    // 2. VALIDATE INPUT
    let body
    try {
      const rawBody = await request.json()
      body = RemoveAccessSchema.parse(rawBody)
    } catch (validationError: any) {
      if (validationError instanceof z.ZodError) {
        return NextResponse.json({ 
          error: 'Invalid input', 
          details: validationError.issues.map(e => `${e.path.join('.')}: ${e.message}`)
        }, { status: 400 })
      }
      return NextResponse.json({ error: 'Invalid request format' }, { status: 400 })
    }
    
    const { userId, orgId } = body
    
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
    
    // 3. AUDIT LOG (if table exists)
    try {
      await supabaseAdmin
        .from('dashboard_audit_log')
        .insert({
          action: 'remove_org_access',
          admin_email: user.email,
          target_user_id: userId,
          org_id: orgId,
          timestamp: new Date().toISOString()
        })
    } catch (auditError: any) {
      // Audit table might not exist - that's OK, log to console
      console.log('📝 Audit log:', user.email, 'removed user from', orgId)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error in remove-access API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

