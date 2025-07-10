import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enrichApiUsageData } from '@/lib/data-enricher'
import { enhanceCostData, getLangfuseCostData } from '@/lib/cost-calculator'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = parseInt(searchParams.get('days') || '30')
  const orgId = searchParams.get('orgId')
  
  try {
    const startDate = startOfDay(subDays(new Date(), days))
    const endDate = endOfDay(new Date())
    
    // Get all usage data
    const { data: usageData, error } = await supabaseAdmin
      .from('api_usage')
      .select('*')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', endDate.toISOString())
    
    if (error) throw error
    
    // Enrich the data with estimated costs and metadata
    const enrichedData = enrichApiUsageData(usageData || [])
    
    // Filter by organization if specified
    let filteredData = enrichedData
    if (orgId) {
      filteredData = filteredData.filter(item => 
        item.metadata?.org_id === orgId || 
        item.metadata?.organization === orgId
      )
    }
    
    // Get enhanced cost breakdown
    const costBreakdown = enhanceCostData(filteredData)
    
    // Get Langfuse cost data (if available)
    const langfuseCostData = await getLangfuseCostData(orgId || undefined, days)
    
    // Calculate trends and forecasts
    const dailyCosts = Object.entries(costBreakdown.dailyCosts)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date))
    
    // Simple trend calculation (linear regression)
    const avgDailyCost = dailyCosts.length > 0 
      ? dailyCosts.reduce((sum, day) => sum + day.cost, 0) / dailyCosts.length 
      : 0
    
    const monthlyForecast = avgDailyCost * 30
    const costTrend = dailyCosts.length >= 2 
      ? dailyCosts[dailyCosts.length - 1].cost - dailyCosts[0].cost
      : 0
    
    // Top endpoints by cost
    const endpointCosts = new Map()
    filteredData.forEach(item => {
      const endpoint = item.endpoint
      const cost = parseFloat(item.metadata?.cost_usd || '0')
      endpointCosts.set(endpoint, (endpointCosts.get(endpoint) || 0) + cost)
    })
    
    const topEndpoints = Array.from(endpointCosts.entries())
      .map(([endpoint, cost]) => ({
        endpoint,
        cost,
        requests: filteredData.filter(item => item.endpoint === endpoint).length,
        avgCostPerRequest: cost / filteredData.filter(item => item.endpoint === endpoint).length
      }))
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 10)
    
    return NextResponse.json({
      summary: {
        totalCost: costBreakdown.totalCost,
        averageCostPerRequest: costBreakdown.averageCostPerRequest,
        monthlyForecast,
        costTrend,
        totalRequests: filteredData.length
      },
      breakdown: {
        models: costBreakdown.topCostDrivers,
        organizations: Object.entries(costBreakdown.organizationCosts)
          .map(([orgId, cost]) => ({ orgId, cost }))
          .sort((a, b) => b.cost - a.cost),
        endpoints: topEndpoints,
        daily: dailyCosts
      },
      langfuse: langfuseCostData,
      trends: {
        dailyAverage: avgDailyCost,
        weeklyTrend: costTrend,
        monthlyProjection: monthlyForecast,
        efficiency: filteredData.length > 0 ? costBreakdown.totalCost / filteredData.length : 0
      }
    })
  } catch (error) {
    console.error('Cost analysis error:', error)
    return NextResponse.json({ error: 'Failed to fetch cost analysis' }, { status: 500 })
  }
} 