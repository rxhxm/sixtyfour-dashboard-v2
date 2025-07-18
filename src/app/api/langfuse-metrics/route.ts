import { NextRequest, NextResponse } from 'next/server'
import { 
  fetchLangfuseDailyMetrics, 
  fetchLangfuseTraces,
  fetchLangfuseMetrics,
  getDateRange,
  processTracesForDashboard,
  extractOrgIdFromTrace,
  extractFunctionFromTrace
} from '@/lib/langfuse'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const selectedOrg = searchParams.get('selectedOrg')
    const days = parseInt(searchParams.get('days') || '30')

    console.log('Langfuse metrics API called with:', { 
      startDate, 
      endDate, 
      selectedOrg, 
      days
    })

    // Handle "All Time" case - when both dates are undefined/null
    let fromTimestamp: string | undefined
    let toTimestamp: string | undefined
    
    if (startDate && endDate && startDate !== 'null' && endDate !== 'null') {
      try {
      fromTimestamp = new Date(startDate).toISOString()
      toTimestamp = new Date(endDate).toISOString()
        console.log('Using provided date range:', { fromTimestamp, toTimestamp })
      } catch (error) {
        console.error('Error parsing dates:', error)
        fromTimestamp = undefined
        toTimestamp = undefined
      }
    } else {
      // For "All Time" - don't set date filters
      fromTimestamp = undefined
      toTimestamp = undefined
      console.log('Using "All Time" - no date filters')
    }

    // For date-filtered requests, use ONLY daily metrics for better performance
    if (fromTimestamp && toTimestamp) {
      console.log('Using optimized daily metrics approach for date-filtered request')
      
    const dailyMetricsOptions: any = {
      fromTimestamp,
      toTimestamp,
      limit: 50
    }

    // If organization is selected, try to filter by traceName
    if (selectedOrg && selectedOrg !== 'all') {
      dailyMetricsOptions.traceName = selectedOrg
    }

      try {
        const dailyMetrics = await fetchLangfuseDailyMetrics(dailyMetricsOptions)

        // Calculate summary metrics from daily data
    let totalCost = 0
    let totalTraces = 0
    let totalTokens = 0
    const modelCosts: Record<string, number> = {}
    const modelUsage: Record<string, { tokens: number, cost: number, traces: number }> = {}
        const orgBreakdown = new Map<string, { requests: number, cost: number, tokens: number }>()

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

            // Extract organization data from traceName if available
            if (day.traceName && day.traceName !== 'undefined') {
              const orgName = day.traceName
              const existing = orgBreakdown.get(orgName) || { requests: 0, cost: 0, tokens: 0 }
              existing.requests += day.countTraces || 0
              existing.cost += day.totalCost || 0
              existing.tokens += day.usage?.reduce((sum: number, u: any) => sum + (u.totalUsage || 0), 0) || 0
              orgBreakdown.set(orgName, existing)
            }
          }
        }

        // Convert organization breakdown to array
        const organizations = Array.from(orgBreakdown.entries())
          .filter(([orgName, data]) => {
            // Filter out system traces and unknown organizations
            if (orgName === 'Unknown' || orgName === 'unknown' || orgName === 'undefined') return false
            
            const systemNames = ['OpenAI-generation', 'openai-generation', 'system', 'internal']
            if (systemNames.includes(orgName)) return false
            
            // Only include organizations with meaningful trace counts
            if (data.requests < 2) return false
            
            return true
          })
          .map(([orgName, data]) => ({
            name: orgName,
            requests: data.requests,
        cost: data.cost,
        tokens: data.tokens
      }))
      .sort((a, b) => b.requests - a.requests)
          .slice(0, 10)

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
            tracesCount: 0, // Not fetched for performance
            isAllTime: false,
            optimizedMode: true
          }
        }

        console.log('Optimized Langfuse response:', {
          totalCost: response.summary.totalCost,
          totalTraces: response.summary.totalTraces,
          totalTokens: response.summary.totalTokens,
          organizationsCount: response.organizations.length,
          chartDataPoints: response.chartData.length
        })

        return NextResponse.json(response)

              } catch (error) {
          console.error('Error fetching Langfuse daily metrics:', error)
          // Fall back to empty data
          return NextResponse.json({
            summary: { totalCost: 0, totalTraces: 0, totalTokens: 0, avgCostPerTrace: 0 },
            organizations: [],
            modelCosts: {},
            modelUsage: {},
            chartData: [],
            dateRange: { fromTimestamp, toTimestamp },
            raw: { dailyMetricsCount: 0, tracesCount: 0, isAllTime: false, optimizedMode: true, error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }
    }

    // For "All Time" requests, use the existing trace-based approach
    console.log('Using trace-based approach for All Time request')
    
    const baseTraceOptions: any = {}
    
    // Add organization filtering via tags if selected
    if (selectedOrg && selectedOrg !== 'all') {
      baseTraceOptions.tags = [`org_id:${selectedOrg}`]
    }

    let traces
    try {
      traces = await fetchLangfuseTraces({
        ...baseTraceOptions,
        limit: 1000 // Use a reasonable limit instead of pagination
      })
      console.log(`All Time traces fetched: ${traces?.data?.length || 0} traces`)
    } catch (error) {
      console.error('Error fetching Langfuse traces:', error)
      traces = { data: [] }
    }

    // Process traces using the new tagging system
    let processedData: any = { organizations: [], functions: [], totalTraces: 0, totalCost: 0, totalTokens: 0 }
    if (traces?.data && traces.data.length > 0) {
      processedData = processTracesForDashboard(traces.data)
    }

    // For "All Time" without daily metrics, use processed data
    const totalTraces = processedData.totalTraces
    const totalCost = processedData.totalCost
    const totalTokens = processedData.totalTokens

    // Convert organizations to the format expected by frontend
    const organizations = processedData.organizations
      .filter((org: any) => {
        if (org.org_id === 'Unknown' || org.org_id === 'unknown') return false
        
        const systemNames = ['OpenAI-generation', 'openai-generation', 'system', 'internal']
        if (systemNames.includes(org.org_id)) return false
        
        if (org.total_traces < 2) return false
        
        return true
      })
      .map((org: any) => ({
        name: org.org_id,
        requests: org.total_traces,
        cost: org.total_cost,
        tokens: org.total_tokens
      }))
      .sort((a: any, b: any) => b.requests - a.requests)
      .slice(0, 10)

    const response = {
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalTraces,
        totalTokens,
        avgCostPerTrace: totalTraces > 0 ? Math.round((totalCost / totalTraces) * 10000) / 10000 : 0
      },
      organizations,
      modelCosts: {},
      modelUsage: {},
      chartData: [],
      dateRange: {
        fromTimestamp,
        toTimestamp
      },
      raw: {
        dailyMetricsCount: 0,
        tracesCount: traces?.data?.length || 0,
        isAllTime: true,
        optimizedMode: false,
        processedOrganizations: processedData.organizations,
        processedFunctions: processedData.functions
      }
    }

    console.log('All Time Langfuse response:', {
      totalCost: response.summary.totalCost,
      totalTraces: response.summary.totalTraces,
      totalTokens: response.summary.totalTokens,
      organizationsCount: response.organizations.length
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