import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const { id } = await params
    const body = await request.json()
    const { org_id } = body

    // Validate - org_id can be null or a string
    if (org_id !== null && typeof org_id !== 'string') {
      return NextResponse.json({ error: 'org_id must be a string or null' }, { status: 400 })
    }

    // Update the workflow template
    const { data, error } = await supabaseAdmin
      .from('workflow_templates')
      .update({ org_id: org_id || null })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating workflow template:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      template: data,
      message: `Template assigned to ${org_id || 'Unassigned'}`
    })

  } catch (error: any) {
    console.error('Workflow template update error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

