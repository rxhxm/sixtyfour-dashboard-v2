import { NextRequest, NextResponse } from 'next/server'

const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || 'pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843'
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || 'sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65'
const LANGFUSE_HOST = process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const traceType = searchParams.get('traceType')
    const limit = searchParams.get('limit') || '500'
    const fromTimestamp = searchParams.get('fromTimestamp')
    const toTimestamp = searchParams.get('toTimestamp')
    
    console.log('API called with:', { orgId, traceType, limit, fromTimestamp, toTimestamp })
    
    // Create auth header
    const authString = Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64')
    
    // Build query params for Langfuse
    const params = new URLSearchParams({
      limit: limit
    })
    
    if (fromTimestamp) params.set('fromTimestamp', fromTimestamp)
    if (toTimestamp) params.set('toTimestamp', toTimestamp)
    
    // Fetch traces from Langfuse
    const tracesResponse = await fetch(`${LANGFUSE_HOST}/api/public/traces?${params}`, {
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!tracesResponse.ok) {
      const errorText = await tracesResponse.text()
      console.error('Langfuse API error:', tracesResponse.status, errorText)
      throw new Error(`Langfuse API error: ${tracesResponse.status}`)
    }
    
    const tracesData = await tracesResponse.json()
    console.log('Langfuse returned:', tracesData.data?.length || 0, 'traces')
    
    // Filter and map traces based on org and type
    const orgIdMap: Record<string, string[]> = {
      'sixtyfour-ai': ['Sixtyfour', 'sixtyfour-ai', 'Ronin', 'ronin'],
      'joshs-personal-org-lejosh': ['josh-sixtyfour', 'Josh', 'josh'],
      'saarth-org': ['saarth', 'Saarth'],
      'sean-org': ['SeanC', 'Sean', 'sean'],
      'sangy-org': ['sangy', 'Sangy'],
      'hashim-org': ['Hashim', 'hashim'],
      'mesmer-org': ['Mesmer', 'mesmer'],
      'ThirtyTwo': ['ThirtyTwo', 'thirtytwo'],
      'circle-square': ['testorg-erik', 'Erik', 'erik'],
      'Unknown': ['nexus', 'unknown', 'Unknown']
    }
    
    console.log('Searching for orgId:', orgId, 'traceType:', traceType)
    console.log('Total traces fetched:', tracesData.data?.length)
    
    // Get all enrich_lead traces for Sixtyfour
    const allSixtyfourTraces = (tracesData.data || []).filter((trace: any) => {
      const tags = trace.tags || []
      const hasOrgTag = tags.some((tag: string) => tag === 'org_id:Sixtyfour')
      const isEnrichLead = trace.name === 'enrich_lead'
      return hasOrgTag && isEnrichLead
    })
    
    console.log(`Found ${allSixtyfourTraces.length} Sixtyfour enrich_lead traces`)
    
    // For now, just return the Sixtyfour traces if that's what we're looking for
    let filteredTraces = []
    if (orgId === 'sixtyfour-ai' && traceType === 'enrich_lead') {
      filteredTraces = allSixtyfourTraces.slice(0, parseInt(limit))
    } else {
      // Handle other orgs
      filteredTraces = (tracesData.data || [])
        .filter((trace: any) => {
          const traceOrgTag = trace.tags?.find((t: string) => t.startsWith('org_id:'))?.split(':')[1]
          const traceOrgMeta = trace.metadata?.org_id
          const traceOrg = traceOrgTag || traceOrgMeta || 'Unknown'
          
          let matchesOrg = false
          if (orgId === 'joshs-personal-org-lejosh') {
            matchesOrg = traceOrg === 'josh-sixtyfour'
          } else if (orgId === 'saarth-org') {
            matchesOrg = traceOrg === 'saarth'
          } else if (orgId === 'sean-org') {
            matchesOrg = traceOrg === 'SeanC'
          } else if (orgId === 'mesmer-org') {
            matchesOrg = traceOrg === 'Mesmer'
          } else {
            matchesOrg = !orgId || traceOrg === orgId
          }
          
          const matchesType = !traceType || trace.name === traceType
          return matchesOrg && matchesType
        })
        .slice(0, parseInt(limit))
    }
    
    // Fetch observations for the first few traces to get model info
    const tracesWithModels = await Promise.all(
      filteredTraces.slice(0, 50).map(async (trace: any) => {
        try {
          // Get first observation ID if available
          const firstObsId = trace.observations?.[0]
          if (firstObsId) {
            const obsResponse = await fetch(`${LANGFUSE_HOST}/api/public/observations/${firstObsId}`, {
              headers: {
                'Authorization': `Basic ${authString}`,
                'Content-Type': 'application/json'
              }
            })
            
            if (obsResponse.ok) {
              const obsData = await obsResponse.json()
              trace.model = obsData.model || trace.model
              trace.usage = obsData.usage || trace.usage
            }
          }
        } catch (e) {
          console.error('Error fetching observation:', e)
        }
        return trace
      })
    )
    
    // Combine with remaining traces
    const allTraces = [
      ...tracesWithModels,
      ...filteredTraces.slice(50)
    ]
    
    // Transform to frontend format
    const transformedTraces = allTraces.map((trace: any) => ({
      id: trace.id,
      name: trace.name,
      timestamp: trace.timestamp,
      duration: trace.latency || 0,
      cost: trace.totalCost || 0,
      tokens: trace.usage?.total || trace.usage?.input || 0,
      model: trace.model || 'gpt-4.1-mini-2025-04-14', // Use actual model from observations
      status: trace.error ? 'error' : 'success',
      input: trace.input,
      output: trace.output,
      metadata: trace.metadata,
      tags: trace.tags || [],
      observations: trace.observations?.length || 0
    }))
    
    return NextResponse.json({
      traces: transformedTraces,
      total: transformedTraces.length
    })
    
  } catch (error) {
    console.error('Error fetching Langfuse traces:', error)
    return NextResponse.json(
      { error: 'Failed to fetch traces', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
