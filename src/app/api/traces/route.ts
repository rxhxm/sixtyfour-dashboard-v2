import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orgId = searchParams.get('orgId')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '100')
  
  try {
    // Try to get traces from existing API usage data with Langfuse trace IDs
    const { data: usageData, error } = await supabaseAdmin
      .from('api_usage')
      .select('*')
      .not('metadata->trace_id', 'is', null)
      .limit(limit)
    
    if (error) {
      console.error('Error fetching usage data for traces:', error)
      throw error
    }
    
    // Transform API usage data into trace format
    const traces = usageData?.map((item: any) => ({
      id: item.metadata?.trace_id || item.id,
      userId: item.metadata?.org_id || item.metadata?.organization || orgId || 'unknown',
      timestamp: item.timestamp,
      cost: parseFloat(item.metadata?.cost_usd || '0'),
      tokens: parseInt(item.metadata?.tokens_used || '0'),
      model: item.metadata?.model_used || item.metadata?.model || 'unknown',
      status: item.metadata?.status_code >= 200 && item.metadata?.status_code < 300 ? 'completed' : 'error',
      endpoint: item.endpoint,
      api_key: item.api_key,
      response_time: item.metadata?.response_time_ms,
      method: item.metadata?.method || 'POST'
    })) || []
    
    // Filter by date range if provided
    let filteredTraces = traces
    if (startDate || endDate) {
      filteredTraces = traces.filter((trace: any) => {
        const traceDate = new Date(trace.timestamp)
        if (startDate && traceDate < new Date(startDate)) return false
        if (endDate && traceDate > new Date(endDate)) return false
        return true
      })
    }
    
    // Filter by organization if provided
    if (orgId) {
      filteredTraces = filteredTraces.filter((trace: any) => trace.userId === orgId)
    }
    
    return NextResponse.json(filteredTraces.slice(0, limit))
  } catch (error) {
    console.error('Langfuse traces error:', error)
    return NextResponse.json({ error: 'Failed to fetch traces' }, { status: 500 })
  }
} 