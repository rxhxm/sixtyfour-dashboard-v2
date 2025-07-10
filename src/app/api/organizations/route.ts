import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    // Get all api_usage data to extract unique organizations
    const { data, error } = await supabaseAdmin
      .from('api_usage')
      .select('api_key')
    
    if (error) {
      console.error('Organizations fetch error:', error)
      throw error
    }
    
    // Extract unique organizations from API keys
    const orgsMap = new Map()
    
    data?.forEach(item => {
      const apiKey = item.api_key
      const orgId = `API-${apiKey.substring(0, 8)}`
      const orgName = `API Key ${apiKey.substring(0, 8)}`
      
      if (!orgsMap.has(orgId)) {
        orgsMap.set(orgId, {
          id: orgId,
          name: orgName,
          slug: orgId.toLowerCase().replace(/\s+/g, '-'),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }
    })
    
    const organizations = Array.from(orgsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
    
    return NextResponse.json(organizations)
  } catch (error) {
    console.error('API organizations error:', error)
    return NextResponse.json({ error: 'Failed to fetch organizations' }, { status: 500 })
  }
} 