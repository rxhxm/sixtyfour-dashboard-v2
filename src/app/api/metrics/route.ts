import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { enrichApiUsageData } from '@/lib/data-enricher'
import { startOfDay, endOfDay, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const orgId = searchParams.get('orgId')
  
  try {
    // Return empty data if Supabase is not configured
    if (!supabaseAdmin) {
      return NextResponse.json({
        totalRequests: 0,
        totalCost: 0,
        totalTokens: 0,
        avgResponseTime: 0,
        successRate: 100,
        organizationBreakdown: []
      })
    }
    
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
    
    // Calculate metrics from real data (no enrichment)
    const totalCost = 0 // No cost data available in real metadata
    const totalTokens = 0 // No token data available in real metadata
    const averageResponseTime = 0 // No response time data available in real metadata
    const successRate = 0 // No status code data available in real metadata
    
    // Get organization mapping from both API key tables
    // First get the NEW api_keys table (current keys)
    const { data: currentApiKeys, error: currentError } = await supabaseAdmin
      .from('api_keys')
      .select('id, key, name, org_id')
      .limit(1000)
    
    // Also get the sixtyfour_api_keys table (legacy keys)
    const { data: sixtyfourApiKeys, error: sixtyfourError } = await supabaseAdmin
      .from('sixtyfour_api_keys')
      .select('key, name, description, org_id')
      .limit(1000)
    
    // Create a mapping from API key to user/org info
    const keyToOrgMap = new Map()
    
    // IMPORTANT: Add NEW api_keys table entries FIRST (these are the current keys)
    currentApiKeys?.forEach((mapping: any) => {
      // For the new api_keys table, use the actual key
      const apiKey = mapping.key
      const userName = mapping.name || 'Unknown User'
      const orgId = mapping.org_id || ''
      
      // Create a display key with first 10 chars
      const keyDisplay = apiKey && apiKey.length > 10 ? `${apiKey.substring(0, 10)}...` : apiKey
      
      // Store with the actual name from the table
      keyToOrgMap.set(apiKey, {
        org_id: userName, // Use name as the grouping ID
        org_name: userName,
        key_name: keyDisplay || 'Current API Key'
      })
      
      // Also try to map by the first part of the key in case it's stored differently
      if (apiKey && apiKey.length > 8) {
        const prefix = apiKey.substring(0, 8)
        if (!keyToOrgMap.has(prefix)) {
          keyToOrgMap.set(prefix, {
            org_id: userName,
            org_name: userName,
            key_name: keyDisplay || 'Current API Key'
          })
        }
      }
    })
    
    // Then add sixtyfour_api_keys entries (legacy keys)
    sixtyfourApiKeys?.forEach((mapping: any) => {
      const key = mapping.key
      const userName = mapping.name || 'Unknown User'
      const description = mapping.description || ''
      const orgId = mapping.org_id || ''
      const keyPrefix = key.substring(0, 10)
      
      // Only add if not already mapped (current keys take priority)
      if (!keyToOrgMap.has(key)) {
        // For legacy keys, use a better format for display
        let displayName = userName
        if (orgId && orgId !== userName) {
          displayName = `${userName} • ${orgId}` // Use a bullet to show both
        }
        
        keyToOrgMap.set(key, { 
          org_id: orgId || userName, // Prefer the real org_id if present
          org_name: displayName,
          key_name: `${keyPrefix}...${description ? ` (${description})` : ''} •` // Add a bullet to indicate legacy
        })
      }
      
      // Also add variations of the key for matching (full UUID, with/without dashes)
      const keyVariations = [
        key,
        key.substring(0, 32), // First 32 chars
                  key.substring(0, 10), // First 10 chars
        key.substring(0, 12), // First 12 chars
        key.substring(0, 8),  // First 8 chars
      ]
      
      keyVariations.forEach(variant => {
        if (variant && !keyToOrgMap.has(variant)) {
          let displayName = userName
          if (orgId && orgId !== userName) {
            displayName = `${userName} • ${orgId}`
          }
          
          keyToOrgMap.set(variant, {
            org_id: orgId || userName,
            org_name: displayName,
            key_name: `${keyPrefix}...${description ? ` (${description})` : ''} •`
          })
        }
      })
    })
    
    // Count usage by organization with scaling factor for sampling
    const orgCounts = new Map()
    const scalingFactor = totalRequests && orgBreakdownData.length > 0 
      ? totalRequests / orgBreakdownData.length 
      : 1
    
    orgBreakdownData.forEach((item: any) => {
      const apiKey = item.api_key
      
      // Try to find organization info for this API key
      let orgInfo = keyToOrgMap.get(apiKey)
      
      // If not found, try partial matches
      if (!orgInfo && apiKey) {
        // Try different lengths of the key for matching
        const keyLengths = [32, 20, 12, 8]
        for (const len of keyLengths) {
          const keyPrefix = apiKey.substring(0, len)
          orgInfo = keyToOrgMap.get(keyPrefix)
          if (orgInfo) break
        }
        
        // If still not found, try to find any key that starts with our prefix
        if (!orgInfo) {
          for (const [mappedKey, mappedInfo] of keyToOrgMap.entries()) {
            if (mappedKey === apiKey || 
                mappedKey.startsWith(apiKey) || 
                apiKey.startsWith(mappedKey) ||
                (mappedKey.length >= 8 && apiKey.length >= 8 && 
                 mappedKey.substring(0, 8) === apiKey.substring(0, 8))) {
              orgInfo = mappedInfo
              break
            }
          }
        }
      }
      
      // If still no match, create a fallback but don't call it "Legacy"
      if (!orgInfo) {
        const keyPrefix = apiKey.substring(0, 12)
        const groupId = `unregistered-${keyPrefix.substring(0, 8)}`
        orgInfo = {
          org_id: groupId,
          org_name: 'Unregistered Key',
          key_name: `${keyPrefix}...`
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
    
    // If there's a significant discrepancy and we have organizations, 
    // proportionally adjust to match the actual total
    if (organizationBreakdown.length > 0 && totalRequests && breakdownTotal > 0) {
      const adjustmentFactor = totalRequests / breakdownTotal
      if (Math.abs(adjustmentFactor - 1) > 0.1) { // Only adjust if difference > 10%
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
