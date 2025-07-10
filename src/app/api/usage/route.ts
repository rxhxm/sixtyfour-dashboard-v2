import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const days = searchParams.get('days') // Allow optional date filtering
  const orgId = searchParams.get('orgId')
  const endpoint = searchParams.get('endpoint')
  const method = searchParams.get('method')
  const status = searchParams.get('status')
  
  try {
    let query = supabaseAdmin
      .from('api_usage')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10000) // Limit to 10K for usage page performance
    
    // Only apply date filtering if days parameter is provided
    if (days) {
      const daysNum = parseInt(days)
      const startDate = startOfDay(subDays(new Date(), daysNum))
      const endDate = endOfDay(new Date())
      query = query.gte('timestamp', startDate.toISOString())
                   .lte('timestamp', endDate.toISOString())
    }
    
    if (endpoint) {
      query = query.eq('endpoint', endpoint)
    }
    
    const { data, error } = await query
    
    if (error) {
      console.error('Usage fetch error:', error)
      throw error
    }

    // Filter data based on metadata fields
    let filteredData = data || []
    
    if (orgId) {
      filteredData = filteredData.filter(item => 
        item.metadata?.org_id === orgId || 
        item.metadata?.organization === orgId
      )
    }
    
    if (method) {
      filteredData = filteredData.filter(item => 
        item.metadata?.method === method
      )
    }
    
    if (status) {
      filteredData = filteredData.filter(item => 
        item.metadata?.status_code === parseInt(status)
      )
    }
    
    return NextResponse.json(filteredData)
  } catch (error) {
    console.error('API usage error:', error)
    return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 })
  }
} 