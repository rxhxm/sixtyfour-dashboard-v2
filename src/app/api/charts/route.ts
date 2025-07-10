import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enrichApiUsageData } from '@/lib/data-enricher'
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = searchParams.get('days') // Allow optional date filtering
  const orgId = searchParams.get('orgId')
  
  try {
    // For charts, we need to aggregate by date efficiently
    // Get data for complete timeline
    let query = supabaseAdmin
      .from('api_usage')
      .select('timestamp, api_key')
      .order('timestamp', { ascending: true })
      .limit(1000000) // Increased limit to capture complete timeline
    
    // Apply date filtering if specified
    if (days) {
      const daysNum = parseInt(days)
      const startDate = startOfDay(subDays(new Date(), daysNum))
      const endDate = endOfDay(new Date())
      query = query.gte('timestamp', startDate.toISOString())
                   .lte('timestamp', endDate.toISOString())
    }
    
    const { data: usageData, error } = await query
    
    if (error) throw error
    
    // Filter by organization if specified
    let filteredData = usageData || []
    if (orgId) {
      filteredData = filteredData.filter(item => 
        item.api_key.startsWith(orgId.replace('API-', ''))
      )
    }
    
    // Generate date range for chart data
    let dateRange: Date[]
    if (days) {
      const daysNum = parseInt(days)
      const startDate = startOfDay(subDays(new Date(), daysNum))
      const endDate = endOfDay(new Date())
      dateRange = eachDayOfInterval({ start: startDate, end: endDate })
    } else {
      // For all historical data, use known date range from April to July 2025
      const startDate = startOfDay(new Date('2025-04-10'))
      const endDate = endOfDay(new Date('2025-07-10'))
      dateRange = eachDayOfInterval({ start: startDate, end: endDate })
    }
    
    // Group data by day and calculate metrics
    const chartData = dateRange.map(date => {
      const dayStart = startOfDay(date)
      const dayEnd = endOfDay(date)
      
      const dayData = filteredData.filter(item => {
        const itemDate = new Date(item.timestamp)
        return itemDate >= dayStart && itemDate <= dayEnd
      })
      
      const requests = dayData.length
      const cost = 0 // No cost data available in real metadata
      const tokens = 0 // No token data available in real metadata
      
      return {
        date: format(date, 'yyyy-MM-dd'),
        requests,
        cost,
        tokens
      }
    })
    
    return NextResponse.json(chartData)
  } catch (error) {
    console.error('API charts error:', error)
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 })
  }
} 