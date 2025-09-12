import { supabaseAdmin } from './supabase';
// Langfuse API client for fetching real trace and cost data
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || 'pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843'
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || 'sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65'
const LANGFUSE_HOST = process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com'

// Create Basic Auth header for Langfuse API
const createAuthHeader = () => {
  const credentials = Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64')
  return `Basic ${credentials}`
}

// Helper functions for new tagging system
export function extractOrgIdFromTags(tags: string[]): string | null {
  if (!tags || !Array.isArray(tags)) return null
  const orgTag = tags.find(tag => tag.startsWith('org_id:'))
  return orgTag ? orgTag.split(':')[1] : null
}

export function extractFunctionFromTags(tags: string[]): string | null {
  if (!tags || !Array.isArray(tags)) return null
  const functionTag = tags.find(tag => tag.startsWith('function:'))
  return functionTag ? functionTag.split(':')[1] : null
}

export function extractOrgIdFromTrace(trace: any): string {
  // Try multiple sources for org_id in order of preference
  
  // 1. Check metadata for org_id
  if (trace.metadata?.org_id) {
    return trace.metadata.org_id
  }
  
  // 2. Check tags for org_id pattern
  if (trace.tags && Array.isArray(trace.tags)) {
    const orgIdTag = trace.tags.find((tag: string) => 
      tag.startsWith('org_id:') || tag.startsWith('organization:') || tag.startsWith('org:')
    )
    if (orgIdTag) {
      const orgId = orgIdTag.split(':')[1]
      if (orgId && orgId.trim()) return orgId.trim()
    }
  }
  
  // 3. Check user ID as potential org identifier (but not if it looks like a trace ID)
  if (trace.userId && trace.userId !== 'undefined' && trace.userId !== 'null' && !trace.userId.startsWith('trace-')) {
    return trace.userId
  }
  
  // 4. Check session ID as potential org identifier (but not if it looks like a trace ID)
  if (trace.sessionId && trace.sessionId !== 'undefined' && trace.sessionId !== 'null' && !trace.sessionId.startsWith('trace-')) {
    return trace.sessionId
  }
  
  // 5. DON'T use trace name as org identifier if it's a function name
  const functionNames = [
    'enrich_lead',
    'enrich_company', 
    'find_email',
    'find_phone',
    'qa_agent',
    'unknown'
  ]
  
  const traceName = trace.name || ''
  // Skip if it's a function name or looks like a trace ID
  if (traceName && !functionNames.includes(traceName) && !traceName.startsWith('trace-') && traceName !== 'undefined') {
    // But also skip if it's clearly a function pattern
    if (!traceName.includes('_') && !traceName.includes('-')) {
    return traceName
    }
  }
  
  // 6. Check any other metadata fields that might contain org info
  if (trace.metadata) {
    for (const [key, value] of Object.entries(trace.metadata)) {
      if (key.toLowerCase().includes('org') && typeof value === 'string' && value.trim() && !value.startsWith('trace-')) {
        return value.trim()
      }
    }
  }
  
  // 7. If we can't find a real org, return "Unknown" - DON'T create fake org from trace ID
  return 'Unknown'
}

export function extractFunctionFromTrace(trace: any): string {
  // Try multiple sources for function name
  if (trace.metadata?.function) return trace.metadata.function
  if (trace.tags) {
    const functionName = extractFunctionFromTags(trace.tags)
    if (functionName) return functionName
  }
  // Fallback to trace name
  return trace.name || 'Unknown'
}

// Function cost patterns for better analytics
export const FUNCTION_COST_PATTERNS = {
  'find_email': { min: 0.001, max: 0.01, avg: 0.005 },
  'find_phone': { min: 0.001, max: 0.01, avg: 0.005 },
  'enrich_lead': { min: 0.10, max: 0.50, avg: 0.25 },
  'enrich_company': { min: 0.05, max: 0.30, avg: 0.15 },
  'qa_agent': { min: 0.50, max: 2.00, avg: 1.00 },
  'directory_lead_extraction': { min: 0.20, max: 1.00, avg: 0.50 },
  'search_engine': { min: 0.01, max: 0.05, avg: 0.02 },
  'find_specific_information': { min: 0.05, max: 0.25, avg: 0.12 }
}

// Function token patterns
export const FUNCTION_TOKEN_PATTERNS = {
  'find_email': { min: 50, max: 200, avg: 100 },
  'find_phone': { min: 50, max: 200, avg: 100 },
  'enrich_lead': { min: 1000, max: 5000, avg: 2500 },
  'enrich_company': { min: 500, max: 3000, avg: 1500 },
  'qa_agent': { min: 1000, max: 20000, avg: 8500 },
  'directory_lead_extraction': { min: 2000, max: 10000, avg: 5000 },
  'search_engine': { min: 100, max: 500, avg: 250 },
  'find_specific_information': { min: 500, max: 2000, avg: 1000 }
}

// Fetch daily metrics from Langfuse
export async function fetchLangfuseDailyMetrics(options: {
  fromTimestamp?: string
  toTimestamp?: string
  traceName?: string
  userId?: string
  limit?: number
} = {}) {
  const params = new URLSearchParams()
  
  if (options.fromTimestamp) params.set('fromTimestamp', options.fromTimestamp)
  if (options.toTimestamp) params.set('toTimestamp', options.toTimestamp)
  if (options.traceName) params.set('traceName', options.traceName)
  if (options.userId) params.set('userId', options.userId)
  if (options.limit) params.set('limit', options.limit.toString())
  
  const url = `${LANGFUSE_HOST}/api/public/metrics/daily?${params.toString()}`
  
  try {
    console.log('Fetching Langfuse daily metrics:', url)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': createAuthHeader(),
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Langfuse API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Langfuse daily metrics response:', data)
    return data
  } catch (error) {
    console.error('Error fetching Langfuse daily metrics:', error)
    throw error
  }
}

// Fetch traces from Langfuse
export async function fetchLangfuseTraces(options: {
  page?: number
  limit?: number
  fromTimestamp?: string
  toTimestamp?: string
  name?: string
  userId?: string
  tags?: string[]
} = {}) {
  const params = new URLSearchParams()
  
  if (options.page) params.set('page', options.page.toString())
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.fromTimestamp) params.set('fromTimestamp', options.fromTimestamp)
  if (options.toTimestamp) params.set('toTimestamp', options.toTimestamp)
  if (options.name) params.set('name', options.name)
  if (options.userId) params.set('userId', options.userId)
  if (options.tags) {
    options.tags.forEach(tag => params.append('tags', tag))
  }
  
  const url = `${LANGFUSE_HOST}/api/public/traces?${params.toString()}`
  
  try {
    console.log('Fetching Langfuse traces:', url)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': createAuthHeader(),
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Langfuse API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Langfuse traces response sample:', {
      totalItems: data.meta?.totalItems,
      itemCount: data.data?.length,
      firstItem: data.data?.[0]
    })
    return data
  } catch (error) {
    console.error('Error fetching Langfuse traces:', error)
    throw error
  }
}

// Process traces to extract organization and function metrics
export function processTracesForDashboard(traces: any[]) {
  const orgMetrics = new Map<string, any>()
  const functionMetrics = new Map<string, any>()
  const orgFunctionBreakdown = new Map()
  
  traces.forEach(trace => {
    const orgId = extractOrgIdFromTrace(trace)
    const functionName = extractFunctionFromTrace(trace)
    const cost = trace.calculatedTotalCost || 0
    const tokens = trace.calculatedTotalTokens || 0
    const latency = trace.latency || 0
    const isSuccess = trace.level !== 'ERROR'
    
    // Organization metrics
    if (!orgMetrics.has(orgId)) {
      orgMetrics.set(orgId, {
        org_id: orgId,
        total_traces: 0,
        total_cost: 0,
        total_tokens: 0,
        total_latency: 0,
        success_count: 0,
        function_breakdown: new Map<string, any>()
      })
    }
    
    const orgData = orgMetrics.get(orgId)
    orgData.total_traces += 1
    orgData.total_cost += cost
    orgData.total_tokens += tokens
    orgData.total_latency += latency
    if (isSuccess) orgData.success_count += 1
    
    // Function breakdown within organization
    if (!orgData.function_breakdown.has(functionName)) {
      orgData.function_breakdown.set(functionName, {
        traces: 0,
        cost: 0,
        tokens: 0,
        latency: 0,
        success_count: 0
      })
    }
    
    const orgFuncData = orgData.function_breakdown.get(functionName)
    orgFuncData.traces += 1
    orgFuncData.cost += cost
    orgFuncData.tokens += tokens
    orgFuncData.latency += latency
    if (isSuccess) orgFuncData.success_count += 1
    
    // Global function metrics
    if (!functionMetrics.has(functionName)) {
      functionMetrics.set(functionName, {
        function_name: functionName,
        total_traces: 0,
        total_cost: 0,
        total_tokens: 0,
        total_latency: 0,
        success_count: 0,
        usage_by_org: new Map<string, any>()
      })
    }
    
    const funcData = functionMetrics.get(functionName)
    funcData.total_traces += 1
    funcData.total_cost += cost
    funcData.total_tokens += tokens
    funcData.total_latency += latency
    if (isSuccess) funcData.success_count += 1
    
    // Function usage by organization
    if (!funcData.usage_by_org.has(orgId)) {
      funcData.usage_by_org.set(orgId, { traces: 0, cost: 0, tokens: 0 })
    }
    
    const funcOrgData = funcData.usage_by_org.get(orgId)
    funcOrgData.traces += 1
    funcOrgData.cost += cost
    funcOrgData.tokens += tokens
  })
  
  // Calculate averages and convert Maps to objects
  const processedOrgMetrics = Array.from(orgMetrics.values()).map(org => {
    // Convert function breakdown Map to object
    const functionBreakdownObj: any = {}
    org.function_breakdown.forEach((data: any, func: string) => {
      functionBreakdownObj[func] = {
        ...data,
        avg_latency: data.traces > 0 ? data.latency / data.traces : 0,
        success_rate: data.traces > 0 ? data.success_count / data.traces : 0
      }
    })
    
    return {
      ...org,
      avg_latency: org.total_traces > 0 ? org.total_latency / org.total_traces : 0,
      success_rate: org.total_traces > 0 ? org.success_count / org.total_traces : 0,
      function_breakdown: functionBreakdownObj
    }
  })
  
  const processedFunctionMetrics = Array.from(functionMetrics.values()).map(func => {
    // Convert usage_by_org Map to object
    const usageByOrgObj: any = {}
    func.usage_by_org.forEach((data: any, orgId: string) => {
      usageByOrgObj[orgId] = data
    })
    
    return {
      ...func,
      avg_cost: func.total_traces > 0 ? func.total_cost / func.total_traces : 0,
      avg_tokens: func.total_traces > 0 ? func.total_tokens / func.total_traces : 0,
      avg_latency: func.total_traces > 0 ? func.total_latency / func.total_traces : 0,
      success_rate: func.total_traces > 0 ? func.success_count / func.total_traces : 0,
      usage_by_org: usageByOrgObj
    }
  })
  
  return {
    organizations: processedOrgMetrics,
    functions: processedFunctionMetrics,
    totalTraces: traces.length,
    totalCost: traces.reduce((sum, trace) => sum + (trace.calculatedTotalCost || 0), 0),
    totalTokens: traces.reduce((sum, trace) => sum + (trace.calculatedTotalTokens || 0), 0)
  }
}

// Fetch flexible metrics from Langfuse using the new Metrics API
export async function fetchLangfuseMetrics(query: {
  view: 'traces' | 'observations' | 'scores-numeric' | 'scores-categorical'
  metrics: Array<{ measure: string; aggregation: string }>
  dimensions?: Array<{ field: string }>
  filters?: Array<any>
  timeDimension?: { granularity: 'hour' | 'day' | 'week' | 'month' | 'auto' }
  fromTimestamp: string
  toTimestamp: string
  orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>
}) {
  const url = `${LANGFUSE_HOST}/api/public/metrics?query=${encodeURIComponent(JSON.stringify(query))}`
  
  try {
    console.log('Fetching Langfuse metrics with query:', query)
    
    const response = await fetch(url, {
      headers: {
        'Authorization': createAuthHeader(),
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`Langfuse API error: ${response.status} ${response.statusText}`)
    }
    
    const data = await response.json()
    console.log('Langfuse metrics response:', data)
    return data
  } catch (error) {
    console.error('Error fetching Langfuse metrics:', error)
    throw error
  }
}

// Helper function to calculate date ranges
export function getDateRange(days: number, offset: number = 0) {
  const endDate = new Date()
  endDate.setDate(endDate.getDate() + offset)
  
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days + 1)
  
  return {
    fromTimestamp: startDate.toISOString(),
    toTimestamp: endDate.toISOString()
  }
}

let orgMap: Map<string, string> | null = null;

export async function getOrgName(orgId: string): Promise<string> {
  if (!orgMap) {
    orgMap = new Map();
    const { data, error } = await supabaseAdmin.from('organizations').select('org_id, org_name');
    if (error) {
      console.error('Failed to fetch organization names:', error);
    } else {
      for (const org of data) {
        orgMap.set(org.org_id, org.org_name);
      }
    }
  }
  return orgMap.get(orgId) || orgId;
} 