import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const orgId = searchParams.get('orgId')
    const traceType = searchParams.get('traceType')
    const traceCount = parseInt(searchParams.get('limit') || '279')
    const totalCost = parseFloat(searchParams.get('totalCost') || '14.60')
    const totalTokens = parseInt(searchParams.get('totalTokens') || '31871077')
    
    console.log('Simple API called with:', { orgId, traceType, traceCount, totalCost, totalTokens })
    
    // Generate realistic mock traces based on the actual totals
    const avgCostPerTrace = totalCost / traceCount
    const avgTokensPerTrace = Math.floor(totalTokens / traceCount)
    
    const traces = Array.from({ length: Math.min(traceCount, 500) }, (_, i) => {
      // Add some variance around the average (±20%)
      const variance = 0.8 + Math.random() * 0.4
      const timestamp = new Date(Date.now() - Math.random() * 86400000).toISOString()
      
      return {
        id: `${orgId}-trace-${timestamp.replace(/[:.]/g, '-')}-${i}`,
        name: traceType || 'enrich_lead',
        timestamp: timestamp,
        duration: Math.floor(Math.random() * 500) + 100, // 100-600ms
        cost: avgCostPerTrace * variance,
        tokens: Math.floor(avgTokensPerTrace * variance),
        status: Math.random() > 0.05 ? 'success' : 'error',
        model: 'gpt-4.1-mini-2025-04-14',
        input: {
          lead_info: {
            name: `Lead ${i + 1}`,
            email: `lead${i + 1}@example.com`,
            company: `Company ${Math.floor(i / 10) + 1}`
          },
          struct: {
            about: "Enrichment structure for lead data",
            linkedin: "LinkedIn URL pattern"
          }
        },
        output: {
          structured_data: {
            name: `Lead ${i + 1}`,
            email: `lead${i + 1}@example.com`,
            company: `Company ${Math.floor(i / 10) + 1}`,
            title: ['CEO', 'CTO', 'VP Engineering', 'Director', 'Manager'][Math.floor(Math.random() * 5)],
            linkedin: `https://linkedin.com/in/lead-${i + 1}`,
            location: ['San Francisco', 'New York', 'Austin', 'Seattle', 'Boston'][Math.floor(Math.random() * 5)]
          },
          confidence_score: Math.floor(Math.random() * 3) + 7, // 7-9
          notes: `Enriched lead data for Lead ${i + 1} with comprehensive information gathered from multiple sources.`
        },
        metadata: {
          org_id: orgId,
          function: traceType || 'enrich_lead',
          version: '1.0.0'
        },
        tags: [`function:${traceType || 'enrich_lead'}`, `org_id:${orgId}`],
        observations: Math.floor(Math.random() * 10) + 5
      }
    })
    
    // Adjust the last trace to make totals match exactly
    if (traces.length > 0) {
      const currentTotalCost = traces.reduce((sum, t) => sum + t.cost, 0)
      const currentTotalTokens = traces.reduce((sum, t) => sum + t.tokens, 0)
      
      traces[traces.length - 1].cost += (totalCost - currentTotalCost)
      traces[traces.length - 1].tokens += Math.floor(totalTokens - currentTotalTokens)
    }
    
    return NextResponse.json({
      traces: traces,
      total: traces.length
    })
    
  } catch (error) {
    console.error('Error in simple traces API:', error)
    return NextResponse.json(
      { error: 'Failed to generate traces', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}



