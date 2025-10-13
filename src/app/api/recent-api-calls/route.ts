import { NextRequest, NextResponse } from 'next/server'
import { fetchLangfuseTraces } from '@/lib/langfuse'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit') || '10'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    // Fetch recent traces from Langfuse (where the actual data is!)
    const tracesOptions: any = {
      limit: parseInt(limit),
      page: 1
    }
    
    if (startDate && endDate) {
      tracesOptions.fromTimestamp = startDate
      tracesOptions.toTimestamp = endDate
    }
    
    const tracesData = await fetchLangfuseTraces(tracesOptions)
    
    if (!tracesData?.data || tracesData.data.length === 0) {
      return NextResponse.json({ calls: [] })
    }
    
    // Extract relevant info from traces
    const enrichedCalls = tracesData.data.map((trace: any) => {
      // Extract org from tags
      const orgTag = trace.tags?.find((t: string) => t.startsWith('org_id:'))
      const orgId = orgTag ? orgTag.split(':')[1] : trace.metadata?.org_id || 'Unknown'
      
      return {
        id: trace.id,
        org: orgId,
        endpoint: trace.name || 'API call',
        timestamp: trace.timestamp,
        timeAgo: formatTimeAgo(trace.timestamp)
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

