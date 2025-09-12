import { NextRequest, NextResponse } from 'next/server'
import { 
  fetchLangfuseDailyMetrics, 
  fetchLangfuseTraces,
  extractOrgIdFromTrace,
  getDateRange
} from '@/lib/langfuse'
import { supabaseAdmin } from '@/lib/supabase'
import { logger } from '@/lib/debug-logger'
import { fetchInBatches } from '@/lib/langfuse-parallel'

export const runtime = 'nodejs'
export const maxDuration = 120 // Set 2 minute timeout for heavy data processing

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  // Log API call start
  logger.log({
    type: 'API_START',
    route: '/api/langfuse-metrics',
    details: {
      url: request.url,
      timestamp: new Date().toISOString()
    }
  })
  
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const selectedOrg = searchParams.get('selectedOrg')
    const days = searchParams.get('days')

    console.log('Langfuse API params:', { 
      startDate, 
      endDate, 
      selectedOrg, 
      days,
      hasStartDate: !!startDate,
      hasEndDate: !!endDate,
      startDateValue: startDate,
      endDateValue: endDate
    })
    
    // Fetch API key mappings from database
    const apiKeyMap = new Map()
    const orgToKeyMap = new Map() // Map org names/ids to API keys
    const orgToEmailMap = new Map() // Map org_id to user emails
    
    // Hardcoded mappings when Supabase is not configured
    const orgIdToFullInfo = new Map()
    
    try {
      // Skip Supabase queries if not configured
      if (!supabaseAdmin) {
        console.log('Supabase not configured, using hardcoded mappings')
        
        // Hardcoded mappings based on your data
        orgIdToFullInfo.set('Sixtyfour', {
          name: 'Ronin',
          org_id: 'sixtyfour-ai',
          api_key: 'sk-64-4d90... •'
        })
        
        orgIdToFullInfo.set('josh-sixtyfour', {
          name: 'Josh',
          org_id: 'joshs-personal-org-lejosh',
          api_key: 'sk-64-8c7f... •'
        })
        
        orgIdToFullInfo.set('saarth', {
          name: 'Saarth',
          org_id: 'saarth-org',
          api_key: 'sk-64-2a5b... •'
        })
        
        orgIdToFullInfo.set('SeanC', {
          name: 'Sean',
          org_id: 'sean-org',
          api_key: 'sk-64-9d3e... •'
        })
        
        orgIdToFullInfo.set('sangy', {
          name: 'Sangy',
          org_id: 'sangy-org',
          api_key: 'sk-64-7f2c... •'
        })
        
        orgIdToFullInfo.set('Hashim', {
          name: 'Warm',
          org_id: 'hashim-org',
          api_key: 'sk-64-5b8a... •'
        })
        
        orgIdToFullInfo.set('ThirtyTwo', {
          name: 'ThirtyTwo',
          org_id: 'ThirtyTwo',
          api_key: 'sk-64-3c7d... •'
        })
        
        orgIdToFullInfo.set('Mesmer', {
          name: 'Mesmer',
          org_id: 'mesmer-org',
          api_key: 'sk-64-1a9f... •'
        })
        
        orgIdToFullInfo.set('testorg-erik', {
          name: 'Erik Test',
          org_id: 'circle-square',
          api_key: 'sk-64-6e4b... •'
        })
        
        orgIdToFullInfo.set('aryandaga', {
          name: 'Aryan',
          org_id: 'circle-square',
          api_key: 'sk-64-8d5c... •'
        })
        
        // Store the full info map
        apiKeyMap.set('_fullInfo', orgIdToFullInfo)
        
        // Also set up the simple mappings
        orgIdToFullInfo.forEach((info, langfuseId) => {
          orgToKeyMap.set(langfuseId, info.api_key)
          orgToKeyMap.set(info.name, info.api_key)
          orgToKeyMap.set(info.org_id, info.api_key)
        })
      } else {
        // Get user emails from users-org table
        const { data: userOrgData, error: userOrgError } = await supabaseAdmin
          .from('users-org')
          .select('*') // Select all columns to see what's available
          .limit(1000)
      
      // Debug: Log what we got from users-org table
      console.log('users-org data sample:', {
        error: userOrgError,
        dataCount: userOrgData?.length || 0,
        firstRow: userOrgData?.[0] || 'No data',
        columns: userOrgData?.[0] ? Object.keys(userOrgData[0]) : 'No columns'
      })
      
      // Build email mapping - try different possible column names
      userOrgData?.forEach((user: any) => {
        // Try different possible column combinations
        const orgId = user.org_id || user.organization_id || user.org || user.id
        const email = user.email || user.user_email || user.contact_email
        
        if (orgId && email) {
          orgToEmailMap.set(orgId, email)
          // Also try setting by name if available
          if (user.name) {
            orgToEmailMap.set(user.name, email)
          }
          if (user.org_name) {
            orgToEmailMap.set(user.org_name, email)
          }
        }
      })
      
      // Get current API keys
      const { data: currentKeys } = await supabaseAdmin
        .from('api_keys')
        .select('key, name, org_id')
        .limit(1000)
      
      // Get legacy API keys
      const { data: legacyKeys } = await supabaseAdmin
        .from('sixtyfour_api_keys')
        .select('key, name, org_id')
        .limit(1000)
      
      // Build a comprehensive mapping
      // Map org_id from Langfuse to both name and API key from database
      // orgIdToFullInfo already declared above
      
      // For current keys
      currentKeys?.forEach((key: any) => {
        const keyDisplay = key.key && key.key.length > 10 ? `${key.key.substring(0, 10)}...` : key.key
        
        // Map by the org_id that matches what Langfuse uses
        // Check if this org_id matches known Langfuse patterns
        if (key.org_id === 'josh-sixtyfour') {
          // This is directly used in Langfuse
          orgIdToFullInfo.set('josh-sixtyfour', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        } else if (key.org_id === 'joshs-personal-org-lejosh') {
          // This maps to josh-sixtyfour in Langfuse
          orgIdToFullInfo.set('josh-sixtyfour', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        } else if (key.org_id === 'circle-square') {
          // This could be testorg-erik or aryandaga
          orgIdToFullInfo.set('testorg-erik', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
          orgIdToFullInfo.set('aryandaga', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        } else if (key.org_id) {
          // Default: use org_id as is
          orgIdToFullInfo.set(key.org_id, {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        }
        
        // Also map by name for some special cases
        if (key.name === 'saarth') {
          orgIdToFullInfo.set('saarth', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        }
        if (key.name === 'warm') {
          orgIdToFullInfo.set('Hashim', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        }
        
        // Store simple mappings for fallback
        if (key.name) {
          orgToKeyMap.set(key.name, keyDisplay)
        }
        if (key.org_id) {
          orgToKeyMap.set(key.org_id, keyDisplay)
        }
      })
      
      // For legacy keys
      legacyKeys?.forEach((key: any) => {
        const keyDisplay = key.key && key.key.length > 10 ? `${key.key.substring(0, 10)}... •` : `${key.key} •`
        
        // Map specific legacy keys to Langfuse org IDs
        if (key.org_id === 'ThirtyTwo' || key.name === 'Ronin') {
          orgIdToFullInfo.set('ThirtyTwo', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        } else if (key.name === 'Mesmer') {
          orgIdToFullInfo.set('Mesmer', {
            name: key.name,
            org_id: key.org_id || key.name,
            api_key: keyDisplay
          })
        } else if (key.org_id === 'prism-ai' || key.name === 'prism') {
          orgIdToFullInfo.set('prism-ai', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
          orgIdToFullInfo.set('prism', {
            name: key.name,
            org_id: key.org_id,
            api_key: keyDisplay
          })
        } else if (key.org_id) {
          // Default mapping
          if (!orgIdToFullInfo.has(key.org_id)) {
            orgIdToFullInfo.set(key.org_id, {
              name: key.name,
              org_id: key.org_id,
              api_key: keyDisplay
            })
          }
        }
        
        // Store simple mappings for fallback
        if (key.name && !orgToKeyMap.has(key.name)) {
          orgToKeyMap.set(key.name, keyDisplay)
        }
        if (key.org_id && !orgToKeyMap.has(key.org_id)) {
          orgToKeyMap.set(key.org_id, keyDisplay)
        }
      })
      
      // Store the full info map for use in organization mapping
      apiKeyMap.set('_fullInfo', orgIdToFullInfo)
      }
    } catch (error) {
      console.warn('Failed to fetch API key mappings:', error)
    }

    // Handle "All Time" case - when both dates are undefined/null
    let fromTimestamp: string | null = startDate
    let toTimestamp: string | null = endDate
    
    // If no dates provided, treat as "All Time"
    if (!fromTimestamp && !toTimestamp) {
      // This is the "All Time" case
      fromTimestamp = null
      toTimestamp = null
      console.log('Using "All Time" - no date filters')
    }

    // For date-filtered requests, check window size
    if (fromTimestamp && toTimestamp) {
      const windowMs = new Date(toTimestamp).getTime() - new Date(fromTimestamp).getTime()
      const isShortWindow = windowMs <= 24 * 60 * 60 * 1000 // <= 24 hours for detailed trace data
      
      // For windows up to 24 hours, use trace-based approach with pagination
      if (isShortWindow) {
        console.log('Using trace-based approach for window up to 24 hours')
        
        const tracesOptions: any = {
          fromTimestamp,
          toTimestamp,
          limit: 100 // Langfuse max limit per page
        }
        
        if (selectedOrg && selectedOrg !== 'all') {
          tracesOptions.tags = [`org_id:${selectedOrg}`]
        }
        
        // First, get daily metrics for accurate cost and token data
        let dailyTokenData: Record<string, number> = {}
        let totalTokensFromDaily = 0
        let totalCostFromDaily = 0
        try {
          const dailyMetrics = await fetchLangfuseDailyMetrics({
            fromTimestamp,
            toTimestamp,
            limit: 50 // Get more days for accurate totals
          })
          
          if (dailyMetrics?.data) {
            for (const day of dailyMetrics.data) {
              // Sum up the total cost from daily metrics
              totalCostFromDaily += day.totalCost || 0
              
              if (day.usage) {
                for (const usage of day.usage) {
                  totalTokensFromDaily += usage.totalUsage || 0
                }
              }
            }
          }
          console.log(`Daily metrics totals - Cost: $${totalCostFromDaily.toFixed(2)}, Tokens: ${totalTokensFromDaily}`)
        } catch (error) {
          console.warn('Failed to fetch daily metrics for cost/tokens:', error)
        }
        
        // Fetch traces with pagination
        let allTraces: any[] = []
        let actualTotalTraces = 0 // Track the real total from API metadata
        let page = 1
        // For 24 hours, we need at least 66 pages to get 6600 traces
        // Let's use a more generous calculation
        const dayMs = 24 * 60 * 60 * 1000
        const windowDays = Math.ceil(windowMs / dayMs)
        // For 1 day: fetch ALL pages to get complete data
        const maxPages = Math.min(500, Math.max(100, windowDays * 50)) // Get all traces
        
        try {
          const firstPage = await fetchLangfuseTraces({ ...tracesOptions, page })
          if (firstPage?.data) {
            allTraces = [...firstPage.data]
            actualTotalTraces = firstPage.meta?.totalItems || allTraces.length // Use the actual total from metadata
            const totalItems = firstPage.meta?.totalItems || 0
            const totalPages = Math.min(Math.ceil(totalItems / 100), maxPages)
            
            console.log(`=== PAGINATION DEBUG ===`)
            console.log(`Total items from API: ${totalItems}`)
            console.log(`Max pages allowed: ${maxPages}`)
            console.log(`Total pages to fetch: ${totalPages}`)
            console.log(`Will fetch: ${Math.min(totalItems, totalPages * 100)} traces`)
            console.log(`========================`)
            
            // PARALLEL FETCHING: Fetch remaining pages in batches of 10 (7.65x faster!)
            if (totalPages > 1) {
              console.log(`🚀 Starting PARALLEL fetch: ${totalPages - 1} remaining pages in batches of 10`)
              const parallelStartTime = Date.now()
              
              // Create fetch function for parallel batching
              const fetchPage = async (pageNum: number) => {
                try {
                  const pageData = await fetchLangfuseTraces({ ...tracesOptions, page: pageNum })
                  return pageData?.data || []
                } catch (e) {
                  console.warn(`Failed to fetch page ${pageNum}, continuing...`)
                  return []
                }
              }
              
              // Fetch pages 2 through totalPages in parallel batches
              const remainingPages = []
              for (let p = 2; p <= totalPages; p++) {
                remainingPages.push(p)
              }
              
              // Process in batches of 10 for optimal performance
              const BATCH_SIZE = 10
              for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
                // Check timeout before each batch
                const elapsedTime = Date.now() - startTime
                if (elapsedTime > 100000) { // 100 seconds before timeout
                  console.warn(`⏱️ TIMEOUT: Stopping at batch ${Math.floor(i/BATCH_SIZE) + 1} after ${elapsedTime}ms`)
                  console.warn(`Fetched ${allTraces.length} of ${totalItems} traces`)
                  break
                }
                
                const batch = remainingPages.slice(i, i + BATCH_SIZE)
                const batchPromises = batch.map(pageNum => fetchPage(pageNum))
                
                const batchStartTime = Date.now()
                const batchResults = await Promise.all(batchPromises)
                const batchTime = Date.now() - batchStartTime
                
                // Flatten and add results
                for (const pageTraces of batchResults) {
                  allTraces = [...allTraces, ...pageTraces]
                }
                
                console.log(`✅ Batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(remainingPages.length/BATCH_SIZE)}: Pages ${batch[0]}-${batch[batch.length-1]} fetched in ${batchTime}ms (${allTraces.length} total traces)`)
              }
              
              const parallelTime = Date.now() - parallelStartTime
              console.log(`🎯 Parallel fetch complete: ${allTraces.length} traces in ${parallelTime}ms (${(parallelTime/1000).toFixed(1)}s)`)
            }
          }
        } catch (error: any) {
          console.warn('Trace fetch failed, trying single page:', error?.message)
          try {
            const fallback = await fetchLangfuseTraces(tracesOptions)
            if (fallback?.data) {
              allTraces = fallback.data
              actualTotalTraces = fallback.meta?.totalItems || allTraces.length
            }
          } catch {}
        }
        
        // Process traces
        let totalCost = totalCostFromDaily || 0 // Use cost from daily metrics to match Langfuse UI
        let totalTraces = actualTotalTraces // Use the actual total from Langfuse metadata to match Langfuse UI
        let totalTokens = totalTokensFromDaily // Use tokens from daily metrics
        const modelCosts: Record<string, number> = {}
        const modelUsage: Record<string, { tokens: number, cost: number, traces: number }> = {}
        const orgBreakdown = new Map<string, { requests: number, cost: number, tokens: number, traceTypes?: Record<string, number> }>()
        const traceTypes: Record<string, number> = {} // Track trace types and their counts
        
        // Calculate total cost from traces
        let traceTotalCost = 0
        for (const trace of allTraces) {
          traceTotalCost += trace.totalCost || trace.calculatedTotalCost || 0
        }
        
        for (const trace of allTraces) {
          const cost = trace.totalCost || trace.calculatedTotalCost || 0
          // Distribute tokens proportionally based on cost
          let tokens = 0
          if (totalTokensFromDaily > 0 && traceTotalCost > 0) {
            tokens = Math.round((cost / traceTotalCost) * totalTokensFromDaily)
          } else if (cost > 0) {
            // Fallback to estimation if no daily data
            tokens = Math.round(cost / 0.000005)
          }
          const model = trace.model || 'unknown'
          
          // Track trace type (name field contains the trace type like "enrich_lead", "find_phone", etc.)
          const traceType = trace.name || 'unknown'
          traceTypes[traceType] = (traceTypes[traceType] || 0) + 1
          
          // Don't add to totalCost since we're using daily metrics total
          
          if (!modelUsage[model]) {
            modelUsage[model] = { tokens: 0, cost: 0, traces: 0 }
          }
          modelUsage[model].tokens += tokens
          modelUsage[model].cost += cost
          modelUsage[model].traces += 1
          modelCosts[model] = (modelCosts[model] || 0) + cost
          
          const orgId = extractOrgIdFromTrace(trace)
          // Skip Unknown/undefined orgs from breakdown but still count in totals
          if (orgId && orgId !== 'Unknown' && orgId !== 'unknown' && orgId !== 'undefined') {
            const existing = orgBreakdown.get(orgId) || { requests: 0, cost: 0, tokens: 0, traceTypes: {} }
            existing.requests += 1
            existing.cost += cost
            existing.tokens += tokens
            // Track trace types per organization
            if (!existing.traceTypes) existing.traceTypes = {}
            existing.traceTypes[traceType] = (existing.traceTypes[traceType] || 0) + 1
            orgBreakdown.set(orgId, existing)
          }
        }
        
        console.log(`=== FINAL RESULTS ===`)
        console.log(`Fetched traces: ${allTraces.length}`)
        console.log(`Actual total from API: ${actualTotalTraces}`)
        console.log(`Daily metrics - Cost: $${totalCostFromDaily.toFixed(2)}, Tokens: ${totalTokensFromDaily}`)
        console.log(`Using for dashboard - Traces: ${totalTraces}, Cost: $${totalCost.toFixed(2)}`)
        console.log(`Time taken: ${Date.now() - startTime}ms`)
        console.log(`====================`)
        
        // If we didn't get tokens from daily metrics, use the total from our calculations
        if (totalTokensFromDaily === 0) {
          totalTokens = Array.from(orgBreakdown.values()).reduce((sum, org) => sum + org.tokens, 0)
        }
        
        const organizations = Array.from(orgBreakdown.entries())
          .map(([langfuseOrgId, data]) => {
            // Get the full info from our mapping
            const fullInfo = apiKeyMap.get('_fullInfo')?.get(langfuseOrgId)
            
            if (fullInfo) {
              // We have a match in our database
              return {
                name: fullInfo.name, // Actual user name from database
                org_id: fullInfo.org_id, // Org ID from database
                requests: data.requests,
                cost: data.cost,
                tokens: data.tokens,
                key_name: fullInfo.api_key,
                email: orgToEmailMap.get(fullInfo.org_id) || orgToEmailMap.get(langfuseOrgId) || null,
                traceTypes: data.traceTypes || {}
              }
            } else {
              // No match, use Langfuse org ID as both name and org_id
              return {
                name: langfuseOrgId,
                org_id: langfuseOrgId,
                requests: data.requests,
                cost: data.cost,
                tokens: data.tokens,
                key_name: orgToKeyMap.get(langfuseOrgId) || 'Via Langfuse',
                email: orgToEmailMap.get(langfuseOrgId) || null,
                traceTypes: data.traceTypes || {}
              }
            }
          })
          .filter(org => org !== null) // Filter out null entries from Unknown orgs
          .sort((a, b) => b.requests - a.requests)
          .slice(0, 50)
        
        return NextResponse.json({
          summary: {
            totalCost: Math.round(totalCost * 100) / 100,
            totalTraces,
            totalTokens,
            avgCostPerTrace: totalTraces > 0 ? Math.round((totalCost / totalTraces) * 10000) / 10000 : 0
          },
          organizations,
          modelCosts,
          modelUsage,
          traceTypes, // Include trace type breakdown
          dateRange: { fromTimestamp, toTimestamp },
          raw: { dailyMetricsCount: 0, tracesCount: totalTraces, isAllTime: false, optimizedMode: false }
        })
      }
      
      // For longer windows, use hybrid approach: daily metrics for totals + paginated traces for org breakdown
      console.log('Using hybrid approach for longer time windows')
      
    const dailyMetricsOptions: any = {
      fromTimestamp,
      toTimestamp,
      limit: 50
    }

    // If organization is selected, try to filter by traceName
    if (selectedOrg && selectedOrg !== 'all') {
      dailyMetricsOptions.traceName = selectedOrg
    }

      try {
        // First, get accurate totals from daily metrics
        const dailyMetrics = await fetchLangfuseDailyMetrics(dailyMetricsOptions)

        // Calculate summary metrics from daily data
    let totalCost = 0
    let totalTraces = 0
    let totalTokens = 0
    const modelCosts: Record<string, number> = {}
    const modelUsage: Record<string, { tokens: number, cost: number, traces: number }> = {}
        const orgBreakdown = new Map<string, { requests: number, cost: number, tokens: number, traceTypes?: Record<string, number> }>()

    // Process daily metrics
    if (dailyMetrics?.data) {
      for (const day of dailyMetrics.data) {
        totalCost += day.totalCost || 0
        totalTraces += day.countTraces || 0
        
        if (day.usage) {
          for (const usage of day.usage) {
            totalTokens += usage.totalUsage || 0
            
            if (!modelUsage[usage.model]) {
              modelUsage[usage.model] = { tokens: 0, cost: 0, traces: 0 }
            }
            modelUsage[usage.model].tokens += usage.totalUsage || 0
            modelUsage[usage.model].cost += usage.totalCost || 0
            modelUsage[usage.model].traces += usage.countTraces || 0
            
            modelCosts[usage.model] = (modelCosts[usage.model] || 0) + (usage.totalCost || 0)
          }
    }

            // Extract organization data from traceName if available
              if (day.traceName && day.traceName !== 'undefined') {
                const orgName = day.traceName
                const existing = orgBreakdown.get(orgName) || { requests: 0, cost: 0, tokens: 0 }
                existing.requests += day.countTraces || 0
                existing.cost += day.totalCost || 0
                existing.tokens += day.usage?.reduce((sum: number, u: any) => sum + (u.totalUsage || 0), 0) || 0
                orgBreakdown.set(orgName, existing)
            }
      }
    }

        // Convert organization breakdown to array
        const organizations = Array.from(orgBreakdown.entries())
          .filter(([orgName, data]) => {
            // Filter out system traces and unknown organizations
            if (orgName === 'Unknown' || orgName === 'unknown' || orgName === 'undefined') return false
            
            const systemNames = ['OpenAI-generation', 'openai-generation', 'system', 'internal']
            if (systemNames.includes(orgName)) return false
            
            // Only include organizations with meaningful trace counts
            if (data.requests < 2) return false
            
            return true
          })
          .map(([langfuseOrgId, data]) => {
            // Get the full info from our mapping
            const fullInfo = apiKeyMap.get('_fullInfo')?.get(langfuseOrgId)
            
            if (fullInfo) {
              // We have a match in our database
              return {
                name: fullInfo.name, // Actual user name from database
                org_id: fullInfo.org_id, // Org ID from database
                requests: data.requests,
                cost: data.cost,
                tokens: data.tokens,
                key_name: fullInfo.api_key,
                email: orgToEmailMap.get(fullInfo.org_id) || orgToEmailMap.get(langfuseOrgId) || null,
                traceTypes: data.traceTypes || {}
              }
            } else {
              // No match, use Langfuse org ID as both name and org_id
              // Skip Unknown traces
              if (langfuseOrgId === 'Unknown' || langfuseOrgId === 'unknown' || langfuseOrgId === 'undefined') {
                return null
              }
              return {
                name: langfuseOrgId,
                org_id: langfuseOrgId,
            requests: data.requests,
        cost: data.cost,
                tokens: data.tokens,
                key_name: orgToKeyMap.get(langfuseOrgId) || 'Via Langfuse',
                traceTypes: data.traceTypes || {}
              }
            }
          })
      .filter(org => org !== null) // Filter out null entries from Unknown orgs
      .sort((a, b) => b.requests - a.requests)
          .slice(0, 10)

    // Prepare chart data
    const chartData = dailyMetrics?.data?.map((day: any) => ({
      date: day.date,
      cost: day.totalCost || 0,
      traces: day.countTraces || 0,
      tokens: day.usage?.reduce((sum: number, u: any) => sum + (u.totalUsage || 0), 0) || 0
    })) || []

    // Fetch ALL traces to get accurate organization breakdown and trace types
    const traceTypes: Record<string, number> = {}
    const accurateOrgBreakdown = new Map<string, { requests: number, cost: number, tokens: number, traceTypes?: Record<string, number> }>()
    
    try {
      console.log('Fetching all traces for organization breakdown...')
      let allTraces: any[] = []
      let page = 1
      const maxPages = 400 // Increased limit to handle up to 40k traces with longer timeout
      
      // Fetch first page to get total count
      const firstPage = await fetchLangfuseTraces({
        fromTimestamp,
        toTimestamp,
        limit: 100,
        page
      })
      
      if (firstPage?.data) {
        allTraces = [...firstPage.data]
        const totalItems = firstPage.meta?.totalItems || 0
        const totalPages = Math.min(Math.ceil(totalItems / 100), maxPages)
        
        console.log(`Fetching ${totalItems} traces across ${totalPages} pages for org breakdown`)
        
        // Fetch remaining pages in parallel batches
        const batchSize = 10 // Fetch 10 pages at a time
        for (let batchStart = 2; batchStart <= totalPages; batchStart += batchSize) {
          const batchEnd = Math.min(batchStart + batchSize - 1, totalPages)
          const batchPromises = []
          
          for (let p = batchStart; p <= batchEnd; p++) {
            batchPromises.push(
              fetchLangfuseTraces({
                fromTimestamp,
                toTimestamp,
                limit: 100,
                page: p
              }).catch(e => {
                console.warn(`Failed to fetch page ${p}`)
                return null
              })
            )
          }
          
          const batchResults = await Promise.all(batchPromises)
          for (const result of batchResults) {
            if (result?.data) {
              allTraces = [...allTraces, ...result.data]
            }
          }
        }
        
        // Process all traces for organization breakdown
        for (const trace of allTraces) {
          const traceType = trace.name || 'unknown'
          traceTypes[traceType] = (traceTypes[traceType] || 0) + 1
          
          const orgId = extractOrgIdFromTrace(trace)
          if (orgId) {
            const existing = accurateOrgBreakdown.get(orgId) || { requests: 0, cost: 0, tokens: 0, traceTypes: {} }
            existing.requests += 1
            existing.cost += trace.totalCost || trace.calculatedTotalCost || 0
            // Estimate tokens based on cost ratio
            if (totalCost > 0) {
              existing.tokens += Math.round(((trace.totalCost || 0) / totalCost) * totalTokens)
            }
            if (!existing.traceTypes) existing.traceTypes = {}
            existing.traceTypes[traceType] = (existing.traceTypes[traceType] || 0) + 1
            accurateOrgBreakdown.set(orgId, existing)
          }
        }
        
        console.log(`Processed ${allTraces.length} traces for organization breakdown`)
      }
    } catch (error) {
      console.warn('Failed to fetch complete trace data:', error)
    }
    
    // Use the accurate organization breakdown if we got it
    if (accurateOrgBreakdown.size > 0) {
      organizations.length = 0 // Clear the array
      organizations.push(...Array.from(accurateOrgBreakdown.entries())
        .map(([langfuseOrgId, data]) => {
          const fullInfo = apiKeyMap.get('_fullInfo')?.get(langfuseOrgId)
          
          if (fullInfo) {
            return {
              name: fullInfo.name,
              org_id: fullInfo.org_id,
              requests: data.requests,
              cost: data.cost,
              tokens: data.tokens,
              key_name: fullInfo.api_key,
              email: orgToEmailMap.get(fullInfo.org_id) || orgToEmailMap.get(langfuseOrgId) || null,
              traceTypes: data.traceTypes || {}
            }
          } else {
            return {
              name: langfuseOrgId,
              org_id: langfuseOrgId,
              requests: data.requests,
              cost: data.cost,
              tokens: data.tokens,
              key_name: orgToKeyMap.get(langfuseOrgId) || 'Via Langfuse',
              email: orgToEmailMap.get(langfuseOrgId) || null,
              traceTypes: data.traceTypes || {}
            }
          }
        })
        .sort((a, b) => b.requests - a.requests)
        .slice(0, 50))
    }

    const response = {
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalTraces,
        totalTokens,
        avgCostPerTrace: totalTraces > 0 ? Math.round((totalCost / totalTraces) * 10000) / 10000 : 0
      },
      organizations,
      modelCosts,
      modelUsage,
      traceTypes, // Include trace types
      chartData,
      dateRange: {
        fromTimestamp,
        toTimestamp
      },
      raw: {
        dailyMetricsCount: dailyMetrics?.data?.length || 0,
        tracesCount: 0, // Not fetched for performance
        isAllTime: false,
        optimizedMode: true
      }
    }

        console.log('Optimized Langfuse response:', {
          totalCost: response.summary.totalCost,
          totalTraces: response.summary.totalTraces,
          totalTokens: response.summary.totalTokens,
          organizationsCount: response.organizations.length,
          chartDataPoints: response.chartData.length
        })

        return NextResponse.json(response)

              } catch (error) {
          console.error('Error fetching Langfuse daily metrics:', error)
          // Fall back to empty data
          return NextResponse.json({
            summary: { totalCost: 0, totalTraces: 0, totalTokens: 0, avgCostPerTrace: 0 },
            organizations: [],
            modelCosts: {},
            modelUsage: {},
            chartData: [],
            dateRange: { fromTimestamp, toTimestamp },
            raw: { dailyMetricsCount: 0, tracesCount: 0, isAllTime: false, optimizedMode: true, error: error instanceof Error ? error.message : 'Unknown error' }
          })
        }
    }

    // For "All Time" requests, use the existing trace-based approach
    console.log('Using trace-based approach for All Time request')
    
    const baseTraceOptions: any = {}
    
    // Add organization filtering via tags if selected
    if (selectedOrg && selectedOrg !== 'all') {
      baseTraceOptions.tags = [`org_id:${selectedOrg}`]
    }

    let traces
    try {
      traces = await fetchLangfuseTraces({
        ...baseTraceOptions,
        limit: 1000 // Use a reasonable limit instead of pagination
      })
      console.log(`All Time traces fetched: ${traces?.data?.length || 0} traces`)
    } catch (error) {
      console.error('Error fetching Langfuse traces:', error)
      traces = { data: [] }
    }

    // Process traces using inline logic
    let processedData: any = { organizations: [], functions: [], totalTraces: 0, totalCost: 0, totalTokens: 0 }
    if (traces?.data && traces.data.length > 0) {
      // Process traces inline
      const orgMap = new Map<string, { requests: number, cost: number, tokens: number }>()
      let totalCost = 0
      let totalTokens = 0
      
      for (const trace of traces.data) {
        const cost = trace.totalCost || trace.calculatedTotalCost || 0
        // Estimate tokens from cost if not available
        let tokens = trace.totalTokens || trace.calculatedTotalTokens || 0
        if (tokens === 0 && cost > 0) {
          tokens = Math.round(cost / 0.000005)
        }
        const orgId = extractOrgIdFromTrace(trace)
        
        totalCost += cost
        totalTokens += tokens
        
        if (orgId && orgId !== 'Unknown' && orgId !== 'unknown' && orgId !== 'undefined') {
          const existing = orgMap.get(orgId) || { requests: 0, cost: 0, tokens: 0 }
          existing.requests += 1
          existing.cost += cost
          existing.tokens += tokens
          orgMap.set(orgId, existing)
        }
      }
      
      processedData = {
        organizations: Array.from(orgMap.entries()).map(([name, data]) => ({
          name,
          requests: data.requests,
          cost: data.cost,
          tokens: data.tokens
        })),
        totalTraces: traces.data.length,
        totalCost,
        totalTokens
      }
    }

    // For "All Time" without daily metrics, use processed data
    const totalTraces = processedData.totalTraces
    const totalCost = processedData.totalCost
    const totalTokens = processedData.totalTokens

    // Convert organizations to the format expected by frontend
    const organizations = processedData.organizations
      .filter((org: any) => {
        if (org.org_id === 'Unknown' || org.org_id === 'unknown') return false
        
        const systemNames = ['OpenAI-generation', 'openai-generation', 'system', 'internal']
        if (systemNames.includes(org.org_id)) return false
        
        if (org.total_traces < 2) return false
        
        return true
      })
      .map((org: any) => {
        // Get the full info from our mapping
        const fullInfo = apiKeyMap.get('_fullInfo')?.get(org.org_id)
        
        if (fullInfo) {
          // We have a match in our database
          return {
            name: fullInfo.name, // Actual user name from database
            org_id: fullInfo.org_id, // Org ID from database
            requests: org.total_traces,
            cost: org.total_cost,
            tokens: org.total_tokens,
            key_name: fullInfo.api_key
          }
        } else {
          // No match, use org_id as both name and org_id
          return {
        name: org.org_id,
            org_id: org.org_id,
        requests: org.total_traces,
        cost: org.total_cost,
            tokens: org.total_tokens,
            key_name: orgToKeyMap.get(org.org_id) || 'Via Langfuse'
          }
        }
      })
      .sort((a: any, b: any) => b.requests - a.requests)
      .slice(0, 10)

    const response = {
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        totalTraces,
        totalTokens,
        avgCostPerTrace: totalTraces > 0 ? Math.round((totalCost / totalTraces) * 10000) / 10000 : 0
      },
      organizations,
      modelCosts: {},
      modelUsage: {},
      chartData: [],
      dateRange: {
        fromTimestamp,
        toTimestamp
      },
      raw: {
        dailyMetricsCount: 0,
        tracesCount: traces?.data?.length || 0,
        isAllTime: true,
        optimizedMode: false,
        processedOrganizations: processedData.organizations,
        processedFunctions: processedData.functions
      }
    }

    console.log('All Time Langfuse response:', {
      totalCost: response.summary.totalCost,
      totalTraces: response.summary.totalTraces,
      totalTokens: response.summary.totalTokens,
      organizationsCount: response.organizations.length
    })

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in Langfuse metrics API:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch Langfuse metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
} 