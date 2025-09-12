import { NextRequest, NextResponse } from 'next/server'
import { fetchLangfuseTraces } from '@/lib/langfuse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const traceType = searchParams.get('traceType')
    const orgId = searchParams.get('orgId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const limit = parseInt(searchParams.get('limit') || '20')
    
    console.log('Fetching trace details:', { traceType, orgId, startDate, endDate, limit })
    
    // Build query options
    const queryOptions: any = {
      limit: Math.min(limit, 1000), // Increased cap to 1000 for better data fetching
    }
    
    // Add date range if provided
    if (startDate && endDate) {
      queryOptions.fromTimestamp = startDate
      queryOptions.toTimestamp = endDate
    }
    
    // Filter by trace name/type
    if (traceType && traceType !== 'unknown') {
      queryOptions.name = traceType
    }
    
    // Filter by organization
    if (orgId) {
      queryOptions.tags = [`org_id:${orgId}`]
    }
    
    // Fetch traces from Langfuse
    const tracesResponse = await fetchLangfuseTraces(queryOptions)
    
    if (!tracesResponse?.data) {
      return NextResponse.json({ traces: [] })
    }
    
    // Transform trace data into a more readable format
    const traces = tracesResponse.data.map((trace: any) => ({
      id: trace.id,
      name: trace.name || 'Unnamed Trace',
      timestamp: trace.timestamp || trace.createdAt,
      duration: trace.latency || trace.duration,
      cost: trace.totalCost || trace.calculatedTotalCost || 0,
      tokens: trace.totalTokens || trace.usage?.total || 0,
      model: trace.model || trace.metadata?.model,
      status: trace.statusMessage || (trace.error ? 'error' : 'success'),
      input: trace.input || trace.metadata?.input,
      output: trace.output || trace.metadata?.output,
      metadata: {
        ...trace.metadata,
        sessionId: trace.sessionId,
        userId: trace.userId,
        release: trace.release,
        version: trace.version,
      },
      error: trace.error,
      userId: trace.userId,
      sessionId: trace.sessionId,
      tags: trace.tags || [],
    }))
    
    return NextResponse.json({ 
      traces,
      total: tracesResponse.meta?.totalItems || traces.length,
      page: tracesResponse.meta?.page || 1,
      totalPages: tracesResponse.meta?.totalPages || 1
    })
    
  } catch (error) {
    console.error('Error fetching trace details:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch trace details',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
