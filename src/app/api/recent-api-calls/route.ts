import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Build query
    let query = supabaseAdmin
      .from('api_usage')
      .select(`
        id,
        endpoint,
        timestamp,
        api_key,
        metadata
      `)
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit))
    
    // Add date filters if provided
    if (startDate) {
      query = query.gte('timestamp', startDate)
    }
    if (endDate) {
      query = query.lte('timestamp', endDate)
    }
    
    const { data: calls, error } = await query
    
    if (error) {
      console.error('Error fetching recent API calls:', error)
      return NextResponse.json({ error: 'Failed to fetch API calls' }, { status: 500 })
    }
    
    // Extract org info from metadata
    const enrichedCalls = (calls || []).map((call: any) => {
      let orgId = 'Unknown'
      
      // Try to get org from metadata
      if (call.metadata) {
        try {
          const meta = typeof call.metadata === 'string' ? JSON.parse(call.metadata) : call.metadata
          orgId = meta?.org_id || meta?.organization || meta?.org || 'Unknown'
        } catch (e) {
          // If metadata parse fails, try to extract from api_key or endpoint
          if (call.api_key) {
            orgId = call.api_key.split('_')[0] || 'Unknown'
          }
        }
      }
      
      return {
        id: call.id,
        org: orgId,
        endpoint: call.endpoint,
        timestamp: call.timestamp,
        timeAgo: formatTimeAgo(call.timestamp)
      }
    })
    
    return NextResponse.json({ calls: enrichedCalls })
    
  } catch (error) {
    console.error('Error in recent-api-calls API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recent API calls' },
      { status: 500 }
    )
  }
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
  return `${Math.floor(diffMins / 1440)}d ago`
}

