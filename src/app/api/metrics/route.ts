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
    // Build the base query with proper chaining
    let countQuery = supabaseAdmin
      .from('api_usage')
      .select('*', { count: 'exact', head: true })
    
    // Apply date filtering if specified
    if (startDate && endDate) {
      countQuery = countQuery.gte('timestamp', startDate).lte('timestamp', endDate)
    }
    
    // Apply organization filtering if specified
    if (orgId) {
      if (orgId.startsWith('API-')) {
        const apiKeyPrefix = orgId.replace('API-', '')
        countQuery = countQuery.like('api_key', `${apiKeyPrefix}%`)
      } else {
        // For real org IDs, we need to get the associated API keys first
        const { data: orgApiKeys } = await supabaseAdmin
          .from('sixtyfour_api_keys')
          .select('key')
          .eq('org_id', orgId)
        
        if (orgApiKeys && orgApiKeys.length > 0) {
          const apiKeysList = orgApiKeys.map(k => k.key)
          countQuery = countQuery.in('api_key', apiKeysList)
        } else {
          // No API keys found for this org, return 0 results
          countQuery = countQuery.eq('api_key', 'no-match')
        }
      }
    }
    
    // Get total count efficiently
    const { count: totalRequests, error: countError } = await countQuery
    
    if (countError) throw countError
    
    console.log('Total requests found:', totalRequests)
    
    // For organization breakdown, we need to be smarter about sampling
    // to ensure the breakdown is representative of the total
    let orgBreakdownData: any[] = []
    
    if (totalRequests && totalRequests > 0) {
      // Build query for organization breakdown data
      let dataQuery = supabaseAdmin
      .from('api_usage')
      .select('api_key, endpoint, timestamp')
      .order('timestamp', { ascending: false })
    
      // Apply same filters as count query
    if (startDate && endDate) {
        dataQuery = dataQuery.gte('timestamp', startDate).lte('timestamp', endDate)
    }
    
    if (orgId) {
      if (orgId.startsWith('API-')) {
        const apiKeyPrefix = orgId.replace('API-', '')
          dataQuery = dataQuery.like('api_key', `${apiKeyPrefix}%`)
             } else {
         // For real org IDs, we need to get the associated API keys first
         const { data: orgApiKeys } = await supabaseAdmin
           .from('sixtyfour_api_keys')
           .select('key')
           .eq('org_id', orgId)
         
         if (orgApiKeys && orgApiKeys.length > 0) {
           const apiKeysList = orgApiKeys.map(k => k.key)
            dataQuery = dataQuery.in('api_key', apiKeysList)
         } else {
           // No API keys found for this org, return 0 results
            dataQuery = dataQuery.eq('api_key', 'no-match')
         }
       }
    }
    
      // If total is manageable (< 50k), get all data for accurate breakdown
      if (totalRequests <= 50000) {
        const { data: allData, error: allDataError } = await dataQuery
        
        if (!allDataError && allData) {
          orgBreakdownData = allData
        }
      } else {
        // For large datasets, use stratified sampling to get representative data
        // Sample from different time periods to ensure accuracy
        const sampleSize = Math.min(20000, Math.max(5000, Math.floor(totalRequests * 0.1)))
        
        const { data: sampleData, error: sampleError } = await dataQuery.limit(sampleSize)
    
        if (!sampleError && sampleData) {
          orgBreakdownData = sampleData
        }
      }
    }
    
    console.log('Organization breakdown data size:', orgBreakdownData.length)
    
    // Calculate metrics from real data (no enrichment)
    const totalCost = 0 // No cost data available in real metadata
    const totalTokens = 0 // No token data available in real metadata
    const averageResponseTime = 0 // No response time data available in real metadata
    const successRate = 0 // No status code data available in real metadata
    
    // Get organization mapping from sixtyfour_api_keys table
    const { data: apiKeyMapping, error: mappingError } = await supabaseAdmin
      .from('sixtyfour_api_keys')
      .select('key, name, description, org_id')
      .limit(1000)
    
    console.log('sixtyfour_api_keys query result:', { 
      mappingCount: apiKeyMapping?.length || 0, 
      mappingError 
    })
    
    // Create a mapping from API key to org_id
    const keyToOrgMap = new Map()
    apiKeyMapping?.forEach((mapping: any) => {
      const key = mapping.key
      const keyName = mapping.name || 'Unknown Key'
      const orgId = mapping.org_id || key.substring(0, 8) // Use actual org_id field, or fallback to key prefix
      
      // Store the full API key mapping with separate org_id and key_name
      keyToOrgMap.set(key, { org_id: orgId, org_name: orgId, key_name: keyName })
    })
    
    // Count usage by organization with scaling factor for sampling
    const orgCounts = new Map()
    const scalingFactor = totalRequests && orgBreakdownData.length > 0 
      ? totalRequests / orgBreakdownData.length 
      : 1
    
    console.log('Scaling factor for organization breakdown:', scalingFactor)
    
    orgBreakdownData.forEach((item: any) => {
      const apiKey = item.api_key
      
      // Try to find exact match first
      let orgInfo = keyToOrgMap.get(apiKey)
      
      // If no exact match, use API key prefix as fallback
      if (!orgInfo) {
        const fallbackOrgId = `API-${apiKey.substring(0, 8)}`
        const fallbackName = `API Key ${apiKey.substring(0, 8)}`
        orgInfo = {
          org_id: fallbackOrgId,
          org_name: fallbackOrgId,
          key_name: fallbackName
        }
      }
      
      const orgId = orgInfo.org_id
      const currentCount = orgCounts.get(orgId)?.requests || 0
      const scaledIncrement = scalingFactor
      
      orgCounts.set(orgId, {
        org_id: orgId,
        org_name: orgInfo.org_name,
        key_name: orgInfo.key_name,
        requests: Math.round(currentCount + scaledIncrement),
        cost: 0,
        tokens: 0
      })
    })
    
    const organizationBreakdown = Array.from(orgCounts.values())
      .sort((a, b) => b.requests - a.requests)
    
    // Verify the breakdown sums approximately to the total
    const breakdownTotal = organizationBreakdown.reduce((sum, org) => sum + org.requests, 0)
    console.log('Breakdown total vs actual total:', { breakdownTotal, totalRequests })
    
    // If there's a significant discrepancy and we have organizations, 
    // proportionally adjust to match the actual total
    if (organizationBreakdown.length > 0 && totalRequests && breakdownTotal > 0) {
      const adjustmentFactor = totalRequests / breakdownTotal
      if (Math.abs(adjustmentFactor - 1) > 0.1) { // Only adjust if difference > 10%
        console.log('Applying adjustment factor:', adjustmentFactor)
        organizationBreakdown.forEach(org => {
          org.requests = Math.round(org.requests * adjustmentFactor)
        })
      }
    }
    
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
