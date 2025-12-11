import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }

    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const orgFilter = searchParams.get('org') || null
    const search = searchParams.get('search') || null
    const offset = (page - 1) * limit

    // Build query - fetch all relevant fields
    let query = supabaseAdmin
      .from('workflow_templates')
      .select('id, org_id, created_at, name, description, category, difficulty, estimated_time, preview_blocks, blocks, author_name, featured, is_global', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (orgFilter === 'null') {
      query = query.is('org_id', null)
    } else if (orgFilter) {
      query = query.eq('org_id', orgFilter)
    }

    if (search) {
      // Search by name or ID
      query = query.or(`name.ilike.%${search}%,id.ilike.%${search}%`)
    }

    const { data: templates, error, count } = await query

    if (error) {
      console.error('Error fetching workflow templates:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get unique org_ids for autocomplete
    const { data: allOrgs } = await supabaseAdmin
      .from('workflow_templates')
      .select('org_id')
    
    const uniqueOrgs = [...new Set(
      (allOrgs || [])
        .map((t: any) => t.org_id)
        .filter((org: any) => org !== null && org !== '')
    )].sort()

    // Count unassigned
    const { count: unassignedCount } = await supabaseAdmin
      .from('workflow_templates')
      .select('id', { count: 'exact', head: true })
      .is('org_id', null)

    return NextResponse.json({
      templates: templates || [],
      totalCount: count || 0,
      unassignedCount: unassignedCount || 0,
      uniqueOrgs,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error: any) {
    console.error('Workflow templates API error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
