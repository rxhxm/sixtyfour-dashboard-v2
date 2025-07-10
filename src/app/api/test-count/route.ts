import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get the total count without fetching all data
    const { count, error } = await supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
    
    if (error) {
      console.error('Count error:', error)
      throw error
    }
    
    // Also get a sample of actual data
    const { data: sample, error: sampleError } = await supabaseAdmin
      .from('api_usage')
      .select('timestamp, endpoint, api_key')
      .order('timestamp', { ascending: false })
      .limit(5)
    
    if (sampleError) {
      console.error('Sample error:', sampleError)
      throw sampleError
    }

    // Get earliest and latest timestamps
    const { data: earliest, error: earliestError } = await supabaseAdmin
      .from('api_usage')
      .select('timestamp')
      .order('timestamp', { ascending: true })
      .limit(1)
    
    const { data: latest, error: latestError } = await supabaseAdmin
      .from('api_usage')
      .select('timestamp')
      .order('timestamp', { ascending: false })
      .limit(1)
    
    return NextResponse.json({
      totalCount: count,
      sampleData: sample,
      dateRange: {
        earliest: earliest?.[0]?.timestamp,
        latest: latest?.[0]?.timestamp
      }
    })
  } catch (error) {
    console.error('Test count error:', error)
    return NextResponse.json({ error: 'Failed to get count' }, { status: 500 })
  }
} 