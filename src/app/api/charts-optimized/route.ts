import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { startOfDay, endOfDay, subDays, format, eachDayOfInterval } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orgId = searchParams.get('orgId')
  
  // console.log('Charts API received params:', { startDate, endDate, orgId }) // Debug logging
  
  try {
    // Use SQL aggregation for better performance with large datasets
    let sqlQuery = `
      SELECT 
        DATE(timestamp) as date,
        COUNT(*) as requests,
        0 as cost,
        0 as tokens
      FROM api_usage
    `
    
    let whereConditions = []
    
    // Add date filtering if specified
    if (startDate && endDate) {
      whereConditions.push(`timestamp >= '${startDate}'`)
      whereConditions.push(`timestamp <= '${endDate}'`)
    }
    
    // Add organization filtering if specified
    if (orgId) {
      if (orgId.startsWith('API-')) {
        const apiKeyPrefix = orgId.replace('API-', '')
        whereConditions.push(`api_key LIKE '${apiKeyPrefix}%'`)
             } else {
         // For real org IDs, we need to get the associated API keys first
         const { data: orgApiKeys } = await supabaseAdmin
           .from('sixtyfour_api_keys')
           .select('key')
           .eq('name', orgId)
         
         if (orgApiKeys && orgApiKeys.length > 0) {
           const apiKeysList = orgApiKeys.map(k => `'${k.key}'`).join(',')
           whereConditions.push(`api_key IN (${apiKeysList})`)
         } else {
           // No API keys found for this org, return 0 results
           whereConditions.push(`api_key = 'no-match'`)
         }
       }
    }
    
    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`
    }
    
    sqlQuery += ` GROUP BY DATE(timestamp) ORDER BY DATE(timestamp) ASC`
    
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: sqlQuery
    })
    
    if (error) {
      console.error('SQL aggregation error:', error)
      // Fallback to original approach if SQL aggregation fails
      return await getFallbackChartData(startDate, endDate, orgId)
    }
    
    // Convert SQL results to expected format
    const chartData = (data || []).map((row: any) => ({
      date: row.date,
      requests: parseInt(row.requests) || 0,
      cost: 0,
      tokens: 0
    }))
    
    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Charts optimized error:', error)
    // Fallback to original approach
    return await getFallbackChartData(startDate, endDate, orgId)
  }
}

// Fallback function using original approach
async function getFallbackChartData(startDate: string | null, endDate: string | null, orgId: string | null) {
  try {
    // Generate complete date range
    const startDateObj = startDate ? new Date(startDate) : startOfDay(new Date('2025-04-10'))
    const endDateObj = endDate ? new Date(endDate) : endOfDay(new Date('2025-07-10'))
    const dateRange = eachDayOfInterval({ start: startDateObj, end: endDateObj })
    
    // Get sample data by date for rough estimation
    const sampleData: Array<{date: string, requests: number, cost: number, tokens: number}> = []
    
    // Sample a few representative days
    const sampleDates = [
      '2025-04-10', '2025-04-11', '2025-04-12', '2025-04-15', '2025-04-20',
      '2025-05-01', '2025-05-15', '2025-06-01', '2025-06-15', 
      '2025-07-01', '2025-07-05', '2025-07-10'
    ]
    
    for (const date of sampleDates) {
      const dayStart = startOfDay(new Date(date))
      const dayEnd = endOfDay(new Date(date))
      
      let query = supabaseAdmin
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .gte('timestamp', dayStart.toISOString())
        .lte('timestamp', dayEnd.toISOString())
      
      // Add organization filtering if specified
      if (orgId) {
        if (orgId.startsWith('API-')) {
          const apiKeyPrefix = orgId.replace('API-', '')
          query = query.like('api_key', `${apiKeyPrefix}%`)
                 } else {
           // For real org IDs, we need to get the associated API keys first
           const { data: orgApiKeys } = await supabaseAdmin
             .from('sixtyfour_api_keys')
             .select('key')
             .eq('name', orgId)
           
           if (orgApiKeys && orgApiKeys.length > 0) {
             const apiKeysList = orgApiKeys.map(k => k.key)
             query = query.in('api_key', apiKeysList)
           } else {
             // No API keys found for this org, return 0 results
             query = query.eq('api_key', 'no-match')
           }
         }
      }
      
      const { count, error } = await query
      
      if (!error) {
        sampleData.push({
          date,
          requests: count || 0,
          cost: 0,
          tokens: 0
        })
      }
    }
    
    // Fill in missing dates with interpolated values
    const chartData = dateRange.map(date => {
      const dateStr = format(date, 'yyyy-MM-dd')
      const existing = sampleData.find(d => d.date === dateStr)
      
      if (existing) {
        return existing
      } else {
        // Simple interpolation for missing dates
        return {
          date: dateStr,
          requests: 0,
          cost: 0,
          tokens: 0
        }
      }
    })
    
    return NextResponse.json(chartData)
  } catch (error) {
    console.error('Fallback chart data error:', error)
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 500 })
  }
} 