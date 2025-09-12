import { NextRequest, NextResponse } from 'next/server'
import { fetchLangfuseDailyMetrics, fetchLangfuseTraces } from '@/lib/langfuse'

export const maxDuration = 30; // Set 30 second timeout

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const selectedOrg = searchParams.get('selectedOrg')

    console.log('Langfuse chart data API called with:', { startDate, endDate, selectedOrg })

    // Handle date filtering
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
      // For "All Time" - don't set date filters at all
      fromTimestamp = undefined
      toTimestamp = undefined
      console.log('Using "All Time" - no date filters')
    }

    // Check window size and determine grouping
    let groupingType: 'minute' | 'hour' | 'day' = 'day'
    if (fromTimestamp && toTimestamp) {
      const windowMs = new Date(toTimestamp).getTime() - new Date(fromTimestamp).getTime()
      const windowHours = windowMs / (60 * 60 * 1000)
      
      if (windowHours <= 1) {
        groupingType = 'minute' // For <= 1 hour, group by minute
      } else if (windowHours <= 48) {
        groupingType = 'hour' // For <= 48 hours, group by hour
      } else {
        groupingType = 'day' // For > 48 hours, group by day
      }
    }

    if (groupingType === 'minute' || groupingType === 'hour') {
      // For short windows, fetch traces and group by minute or hour
      console.log(`Using ${groupingType} grouping for time window`)
      
      const tracesOptions: any = {
        fromTimestamp,
        toTimestamp,
        limit: 100
      }
      
      if (selectedOrg && selectedOrg !== 'all' && selectedOrg !== '') {
        tracesOptions.tags = [`org_id:${selectedOrg}`]
      }
      
      // Fetch traces with pagination
      let allTraces: any[] = []
      let page = 1
      const maxPages = 50 // Increased limit for better hourly coverage
      
      try {
        const firstPage = await fetchLangfuseTraces({ ...tracesOptions, page })
        if (firstPage?.data) {
          allTraces = [...firstPage.data]
          const totalItems = firstPage.meta?.totalItems || 0
          const totalPages = Math.min(Math.ceil(totalItems / 100), maxPages)
          
          for (page = 2; page <= totalPages; page++) {
            try {
              const pageData = await fetchLangfuseTraces({ ...tracesOptions, page })
              if (pageData?.data) {
                allTraces = [...allTraces, ...pageData.data]
              }
            } catch (e) {
              console.warn(`Failed to fetch page ${page} for chart data`)
              break
            }
          }
        }
      } catch (error) {
        console.warn('Failed to fetch traces for chart:', error)
      }
      
      // Group traces by minute or hour
      const groupedData: Record<string, { traces: number, cost: number, tokens: number }> = {}
      const startTime = fromTimestamp ? new Date(fromTimestamp).getTime() : 0
      const endTime = toTimestamp ? new Date(toTimestamp).getTime() : Date.now()
      
      for (const trace of allTraces) {
        const timestamp = new Date(trace.timestamp || trace.createdAt)
        const traceTime = timestamp.getTime()
        
        // Skip traces outside the time window
        if (traceTime < startTime || traceTime > endTime) {
          continue
        }
        
        let groupKey: string
        if (groupingType === 'minute') {
          // Group by minute
          groupKey = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours(),
            timestamp.getMinutes()
          ).toISOString()
        } else {
          // Group by hour
          groupKey = new Date(
            timestamp.getFullYear(),
            timestamp.getMonth(),
            timestamp.getDate(),
            timestamp.getHours()
          ).toISOString()
        }
        
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = { traces: 0, cost: 0, tokens: 0 }
        }
        
        groupedData[groupKey].traces += 1
        groupedData[groupKey].cost += trace.totalCost || 0
        // Estimate tokens from cost if not available
        const tokens = trace.totalTokens || (trace.totalCost ? Math.round(trace.totalCost / 0.000005) : 0)
        groupedData[groupKey].tokens += tokens
      }
      
      // Fill in missing hours/minutes for continuous chart
      const filledData: any[] = []
      if (fromTimestamp && toTimestamp) {
        const start = new Date(fromTimestamp)
        const end = new Date(toTimestamp)
        const current = new Date(start)
        
        while (current <= end) {
          let groupKey: string
          if (groupingType === 'minute') {
            groupKey = new Date(
              current.getFullYear(),
              current.getMonth(),
              current.getDate(),
              current.getHours(),
              current.getMinutes()
            ).toISOString()
            current.setMinutes(current.getMinutes() + 1)
          } else {
            groupKey = new Date(
              current.getFullYear(),
              current.getMonth(),
              current.getDate(),
              current.getHours()
            ).toISOString()
            current.setHours(current.getHours() + 1)
          }
          
          const data = groupedData[groupKey] || { traces: 0, cost: 0, tokens: 0 }
          filledData.push({
            date: groupKey,
            traces: data.traces,
            cost: Math.round(data.cost * 100) / 100,
            tokens: data.tokens
          })
        }
      }
      
      // Use filled data if we have it, otherwise use grouped data
      const chartData = filledData.length > 0 ? filledData : 
        Object.entries(groupedData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,
            traces: data.traces,
            cost: Math.round(data.cost * 100) / 100,
            tokens: data.tokens
          }))
      
      console.log(`${groupingType} chart data points:`, chartData.length)
      return NextResponse.json(chartData)
    }

    // For longer windows, use daily metrics
    const dailyMetricsOptions: any = {
      fromTimestamp,
      toTimestamp,
      limit: 50
    }

    // Add organization filtering if specified
    if (selectedOrg && selectedOrg !== 'all' && selectedOrg !== '') {
      // The daily metrics endpoint supports filtering by userId, not tags.
      // We pass the mapped Langfuse org id as userId so metrics are scoped to that org.
      dailyMetricsOptions.userId = selectedOrg
      console.log('Adding organization filter (userId):', selectedOrg)
    }

    console.log('Daily metrics options being sent to Langfuse:', dailyMetricsOptions)

    try {
      const dailyMetrics = await fetchLangfuseDailyMetrics(dailyMetricsOptions)
      console.log('Daily metrics fetched for chart:', dailyMetrics?.data?.length || 0, 'days')
      
      if (!dailyMetrics?.data || dailyMetrics.data.length === 0) {
        console.log('No daily metrics data available')
        return NextResponse.json([])
      }

      // Process daily metrics into chart format
      const chartData = dailyMetrics.data.map((day: any) => {
        const date = day.date // Should be in YYYY-MM-DD format
        const traces = day.countTraces || 0
        const cost = day.totalCost || 0
        
        // Calculate tokens from usage array
        let tokens = 0
        if (day.usage && Array.isArray(day.usage)) {
          tokens = day.usage.reduce((sum: number, usage: any) => sum + (usage.totalUsage || 0), 0)
        }

        return {
          date,
          traces,
          cost,
          tokens
        }
      }).sort((a: any, b: any) => a.date.localeCompare(b.date))

      console.log('Processed chart data:', {
        totalDays: chartData.length,
        totalTraces: chartData.reduce((sum: number, day: any) => sum + day.traces, 0),
        totalCost: chartData.reduce((sum: number, day: any) => sum + day.cost, 0),
        totalTokens: chartData.reduce((sum: number, day: any) => sum + day.tokens, 0)
      })

      return NextResponse.json(chartData)

    } catch (error) {
      console.error('Error fetching Langfuse daily metrics for chart:', error)
      return NextResponse.json([])
    }

  } catch (error) {
    console.error('Error in Langfuse chart data API:', error)
    return NextResponse.json([])
  }
} 