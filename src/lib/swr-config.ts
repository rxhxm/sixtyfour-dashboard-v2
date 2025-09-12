// SWR Configuration for dashboard data caching
// This provides global configuration for all SWR hooks in the app

export const swrConfig = {
  // Revalidate data every 5 minutes (300,000 ms)
  refreshInterval: 5 * 60 * 1000,
  
  // Keep data fresh when window regains focus
  revalidateOnFocus: true,
  
  // Revalidate when network reconnects
  revalidateOnReconnect: true,
  
  // Dedupe requests within 2 seconds
  dedupingInterval: 2000,
  
  // Keep data in cache even if there's an error
  shouldRetryOnError: true,
  
  // Retry failed requests 3 times
  errorRetryCount: 3,
  
  // Cache data for 24 hours even if stale
  // This allows instant loading even with old data
  fallbackData: undefined,
  
  // Show stale data while revalidating
  revalidateIfStale: true,
  
  // Keep previous data when key changes
  keepPreviousData: true,
}

// Global fetcher function for SWR
export const fetcher = async (url: string) => {
  const res = await fetch(url)
  
  if (!res.ok) {
    const error = new Error('An error occurred while fetching the data.')
    throw error
  }
  
  return res.json()
}

// Fetcher with timeout for long-running requests
export const fetcherWithTimeout = (timeout = 110000) => async (url: string) => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    
    return res.json()
  } catch (error) {
    clearTimeout(timeoutId)
    throw error
  }
}

// Prefetch function to load all data upfront
export const prefetchDashboardData = async (timeRange: any) => {
  const promises = []
  
  // Build URLs with time range
  const params = new URLSearchParams()
  if (timeRange?.startDate) params.set('startDate', timeRange.startDate)
  if (timeRange?.endDate) params.set('endDate', timeRange.endDate)
  
  // Prefetch all endpoints
  const endpoints = [
    `/api/langfuse-metrics?${params}`,
    `/api/langfuse-chart-data?${params}`,
    `/api/metrics?${params}`
  ]
  
  // Fetch all data in parallel
  for (const endpoint of endpoints) {
    promises.push(
      fetch(endpoint)
        .then(res => res.json())
        .then(data => ({ endpoint, data }))
        .catch(error => ({ endpoint, error }))
    )
  }
  
  return Promise.all(promises)
}
