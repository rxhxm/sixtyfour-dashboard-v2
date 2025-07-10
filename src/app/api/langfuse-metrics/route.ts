import { NextRequest, NextResponse } from 'next/server'
import { 
  fetchLangfuseDailyMetrics, 
  fetchLangfuseTraces,
  fetchLangfuseMetrics,
  getDateRange 
} from '@/lib/langfuse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const selectedOrg = searchParams.get('selectedOrg')
    const days = parseInt(searchParams.get('days') || '30')

    console.log('Langfuse metrics API called with:', { startDate, endDate, selectedOrg, days })

    // Use provided dates or calculate from days
    let fromTimestamp: string
    let toTimestamp: string
    
    if (startDate && endDate) {
      fromTimestamp = new Date(startDate).toISOString()
      toTimestamp = new Date(endDate).toISOString()
    } else {
      const dateRange = getDateRange(days)
      fromTimestamp = dateRange.fromTimestamp
      toTimestamp = dateRange.toTimestamp
    }

    console.log('Using date range:', { fromTimestamp, toTimestamp })

    // Fetch daily metrics for cost and usage overview
    const dailyMetricsOptions: any = {
      fromTimestamp,
      toTimestamp,
      limit: 50
    }

    // If organization is selected, try to filter by traceName
    if (selectedOrg && selectedOrg !== 'all') {
      dailyMetricsOptions.traceName = selectedOrg
    }

    const [dailyMetrics, traces] = await Promise.all([
      fetchLangfuseDailyMetrics(dailyMetricsOptions),
      fetchLangfuseTraces({
        fromTimestamp,
        toTimestamp,
        limit: 100,
        ...(selectedOrg && selectedOrg !== 'all' ? { name: selectedOrg } : {})
      })
    ])

    // Calculate summary metrics
    let totalCost = 0
    let totalTraces = 0
    let totalTokens = 0
    const modelCosts: Record<string, number> = {}
    const modelUsage: Record<string, { tokens: number, cost: number, traces: number }> = {}

    // Process daily metrics
    if (dailyMetrics?.data) {
      for (const day of dailyMetrics.data) {
        totalCost += day.totalCost || 0
        totalTraces += day.countTraces || 0
        
        if (day.usage) {
          for (const usage of day.usage) {
            totalTokens += usage.totalUsage || 0
            
            if (!modelUsage[usage.model]) {
              modelUsage[usage.model] = { tokens: 0, cost: 0, traces: 0 }
            }
            modelUsage[usage.model].tokens += usage.totalUsage || 0
            modelUsage[usage.model].cost += usage.totalCost || 0
            modelUsage[usage.model].traces += usage.countTraces || 0
            
            modelCosts[usage.model] = (modelCosts[usage.model] || 0) + (usage.totalCost || 0)
          }
        }
      }
    }

    // Process traces for organization breakdown
    const orgBreakdown: Record<string, { traces: number, cost: number, tokens: number }> = {}
    const traceNames = new Set<string>()

    if (traces?.data) {
      for (const trace of traces.data) {
        const traceName = trace.name || 'Unknown'
        traceNames.add(traceName)
        
        if (!orgBreakdown[traceName]) {
          orgBreakdown[traceName] = { traces: 0, cost: 0, tokens: 0 }
        }
        
        orgBreakdown[traceName].traces += 1
        orgBreakdown[traceName].cost += trace.calculatedTotalCost || 0
        orgBreakdown[traceName].tokens += trace.calculatedTotalTokens || 0
      }
    }

    // Convert to organization format expected by frontend
    const organizations = Object.entries(orgBreakdown)
      .map(([name, data]) => ({
        name,
        requests: data.traces,
        cost: data.cost,
        tokens: data.tokens
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 10) // Top 10 organizations

    // Prepare chart data
    const chartData = dailyMetrics?.data?.map((day: any) => ({
      date: day.date,
      cost: day.totalCost || 0,
      traces: day.countTraces || 0,
      tokens: day.usage?.reduce((sum: number, u: any) => sum + (u.totalUsage || 0), 0) || 0
    })) || []

    const response = {
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalTraces,
        totalTokens,
        avgCostPerTrace: totalTraces > 0 ? Math.round((totalCost / totalTraces) * 10000) / 10000 : 0
      },
      organizations,
      modelCosts,
      modelUsage,
      chartData,
      dateRange: {
        fromTimestamp,
        toTimestamp
      },
      raw: {
        dailyMetricsCount: dailyMetrics?.data?.length || 0,
        tracesCount: traces?.data?.length || 0,
        traceNames: Array.from(traceNames)
      }
    }

    console.log('Langfuse response summary:', {
      totalCost: response.summary.totalCost,
      totalTraces: response.summary.totalTraces,
      organizationsCount: response.organizations.length,
      chartDataPoints: response.chartData.length
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in Langfuse metrics API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Langfuse metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 