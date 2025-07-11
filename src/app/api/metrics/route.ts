import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enrichApiUsageData } from '@/lib/data-enricher'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orgId = searchParams.get('orgId')
  
  console.log('API received params:', { startDate, endDate, orgId }) // Debug logging
  
  try {
    // Get total count efficiently
    let countQuery = supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
    
    // Apply date filtering if specified
    if (startDate && endDate) {
      countQuery = countQuery.gte('timestamp', startDate)
                            .lte('timestamp', endDate)
    }
    
    // Apply organization filtering if specified
    if (orgId) {
      // If it's a real org ID, we need to find the API keys associated with it
      // For now, we'll use a simple approach - if it starts with API-, treat as old format
      if (orgId.startsWith('API-')) {
        const apiKeyPrefix = orgId.replace('API-', '')
        countQuery = countQuery.like('api_key', `${apiKeyPrefix}%`)
      } else {
        // For real org IDs, we need to get the associated API keys first
        const { data: orgApiKeys } = await supabaseAdmin
          .from('sixtyfour_api_keys')
          .select('key')
          .eq('name', orgId)
        
        if (orgApiKeys && orgApiKeys.length > 0) {
          const apiKeysList = orgApiKeys.map(k => k.key)
          countQuery = countQuery.in('api_key', apiKeysList)
        } else {
          // No API keys found for this org, return 0 results
          countQuery = countQuery.eq('api_key', 'no-match')
        }
      }
    }
    
    const { count: totalRequests, error: countError } = await countQuery
    
    if (countError) throw countError
    
    // Get sample data for organization breakdown (limited for performance)
    let sampleQuery = supabaseAdmin
      .from('api_usage')
      .select('api_key, endpoint, timestamp')
      .order('timestamp', { ascending: false })
      .limit(10000) // Sample for org breakdown
    
    if (startDate && endDate) {
      sampleQuery = sampleQuery.gte('timestamp', startDate)
                               .lte('timestamp', endDate)
    }
    
    // Apply organization filtering if specified
    if (orgId) {
      // If it's a real org ID, we need to find the API keys associated with it
      if (orgId.startsWith('API-')) {
        const apiKeyPrefix = orgId.replace('API-', '')
        sampleQuery = sampleQuery.like('api_key', `${apiKeyPrefix}%`)
             } else {
         // For real org IDs, we need to get the associated API keys first
         const { data: orgApiKeys } = await supabaseAdmin
           .from('sixtyfour_api_keys')
           .select('key')
           .eq('name', orgId)
         
         if (orgApiKeys && orgApiKeys.length > 0) {
           const apiKeysList = orgApiKeys.map(k => k.key)
           sampleQuery = sampleQuery.in('api_key', apiKeysList)
         } else {
           // No API keys found for this org, return 0 results
           sampleQuery = sampleQuery.eq('api_key', 'no-match')
         }
       }
    }
    
    const { data: sampleData, error: sampleError } = await sampleQuery
    
    if (sampleError) throw sampleError
    
    // Calculate metrics from real data (no enrichment)
    const totalCost = 0 // No cost data available in real metadata
    const totalTokens = 0 // No token data available in real metadata
    const averageResponseTime = 0 // No response time data available in real metadata
    const successRate = 0 // No status code data available in real metadata
    const successCount = 0
    
    // Try to get organization breakdown from the api_usage table first
    // Check if the api_usage table has org_id column directly
    const { data: usageWithOrgId, error: usageOrgError } = await supabaseAdmin
      .from('api_usage')
      .select('api_key, org_id, metadata')
      .limit(100)
    
    console.log('Usage data with org_id:', { usageWithOrgId, usageOrgError })
    
    if (!usageOrgError && usageWithOrgId && usageWithOrgId.length > 0 && usageWithOrgId[0].org_id) {
      // We can get organization info directly from api_usage table
      console.log('Using org_id directly from api_usage table')
      
      const orgCounts = new Map()
      sampleData?.forEach((item: any) => {
        const orgId = item.org_id || item.metadata?.org_id || `API-${item.api_key.substring(0, 8)}`
        const orgName = item.metadata?.organization || orgId
        
        orgCounts.set(orgId, {
          org_id: orgId,
          org_name: orgName,
          requests: (orgCounts.get(orgId)?.requests || 0) + 1,
          cost: 0,
          tokens: 0
        })
      })
      
      const organizationBreakdown = Array.from(orgCounts.values())
        .sort((a, b) => b.requests - a.requests)
      
      return NextResponse.json({
        totalRequests: totalRequests || 0,
        totalCost,
        totalTokens,
        averageResponseTime,
        successRate,
        organizationBreakdown
      })
    }
    
    // Get organization mapping from sixtyfour_api_keys table
    const { data: apiKeyMapping, error: mappingError } = await supabaseAdmin
      .from('sixtyfour_api_keys')
      .select('key, name, description')
      .limit(1000)
    
    console.log('sixtyfour_api_keys query result:', { apiKeyMapping, mappingError })
    
    if (mappingError || !apiKeyMapping || (apiKeyMapping && apiKeyMapping.length === 0)) {
      console.error('sixtyfour_api_keys mapping error:', mappingError)
      console.log('Falling back to API key prefixes - no mapping available')
      // Fallback to API key prefixes if mapping table doesn't exist
      const orgMap = new Map()
      const orgCounts = new Map()
      
      sampleData?.forEach((item: any) => {
        const apiKey = item.api_key
        orgCounts.set(apiKey, (orgCounts.get(apiKey) || 0) + 1)
      })
      
      Array.from(orgCounts.entries()).forEach(([apiKey, count]) => {
        const orgId = `API-${apiKey.substring(0, 8)}`
        const orgName = `API Key ${apiKey.substring(0, 8)}`
        
        if (!orgMap.has(orgId)) {
          orgMap.set(orgId, {
            org_id: orgId,
            org_name: orgName,
            requests: count,
            cost: 0,
            tokens: 0
          })
        }
      })
      
      const organizationBreakdown = Array.from(orgMap.values())
        .sort((a, b) => b.requests - a.requests)
      
      return NextResponse.json({
        totalRequests: totalRequests || 0,
        totalCost,
        totalTokens,
        averageResponseTime,
        successRate,
        organizationBreakdown
      })
    }
    
    // Create a mapping from API key to org_id
    console.log('API key mapping data:', apiKeyMapping)
    console.log('Number of mappings found:', apiKeyMapping?.length || 0)
    
    const keyToOrgMap = new Map()
    apiKeyMapping?.forEach((mapping: any) => {
      console.log('Processing mapping:', mapping)
      const key = mapping.key
      const orgName = mapping.name || 'Unknown Organization'
      const orgId = mapping.name || key.substring(0, 8) // Use name as org_id, or fallback to key prefix
      
      // Store the full API key mapping
      keyToOrgMap.set(key, { org_id: orgId, org_name: orgName })
    })
    
    // Count usage by organization
    const orgCounts = new Map()
    
    sampleData?.forEach((item: any) => {
      const apiKey = item.api_key
      console.log('Processing API key from usage data:', apiKey)
      
      // Try to find exact match first
      let orgInfo = keyToOrgMap.get(apiKey)
      console.log('Exact match found:', orgInfo)
      
      // If no exact match, use API key prefix as fallback
      if (!orgInfo) {
        orgInfo = {
          org_id: `API-${apiKey.substring(0, 8)}`,
          org_name: `API Key ${apiKey.substring(0, 8)}`
        }
        console.log('Using fallback org info:', orgInfo)
      }
      
      const orgId = orgInfo.org_id
      orgCounts.set(orgId, {
        org_id: orgId,
        org_name: orgInfo.org_name,
        requests: (orgCounts.get(orgId)?.requests || 0) + 1,
        cost: 0,
        tokens: 0
      })
    })
    
    const organizationBreakdown = Array.from(orgCounts.values())
      .sort((a, b) => b.requests - a.requests)
    
    return NextResponse.json({
      totalRequests: totalRequests || 0,
      totalCost,
      totalTokens,
      averageResponseTime,
      successRate,
      organizationBreakdown
    })
  } catch (error) {
    console.error('API metrics error:', error)
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 })
  }
} 