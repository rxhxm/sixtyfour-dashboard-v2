// Langfuse API client for fetching real trace and cost data
const LANGFUSE_PUBLIC_KEY = process.env.LANGFUSE_PUBLIC_KEY || 'pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843'
const LANGFUSE_SECRET_KEY = process.env.LANGFUSE_SECRET_KEY || 'sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65'
const LANGFUSE_HOST = process.env.LANGFUSE_HOST || 'https://us.cloud.langfuse.com'

// Create Basic Auth header for Langfuse API
const createAuthHeader = () => {
  const credentials = Buffer.from(`${LANGFUSE_PUBLIC_KEY}:${LANGFUSE_SECRET_KEY}`).toString('base64')
  return `Basic ${credentials}`
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
} = {}) {
  const params = new URLSearchParams()
  
  if (options.page) params.set('page', options.page.toString())
  if (options.limit) params.set('limit', options.limit.toString())
  if (options.fromTimestamp) params.set('fromTimestamp', options.fromTimestamp)
  if (options.toTimestamp) params.set('toTimestamp', options.toTimestamp)
  if (options.name) params.set('name', options.name)
  if (options.userId) params.set('userId', options.userId)
  
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