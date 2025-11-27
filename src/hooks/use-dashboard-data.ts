'use client'

import useSWR from 'swr'
import { fetcher, fetcherWithTimeout } from '@/lib/swr-config'

// Custom hook for Langfuse metrics
export function useLangfuseMetrics(startDate?: string, endDate?: string, selectedOrg?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (selectedOrg) params.set('selectedOrg', selectedOrg)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/langfuse-metrics?${params}`,
    fetcherWithTimeout(110000), // 110 second timeout for heavy data
    {
      // Keep showing old data while fetching new data
      keepPreviousData: true,
      // Revalidate every 5 minutes
      refreshInterval: 5 * 60 * 1000,
      // Show stale data immediately while revalidating in background
      revalidateIfStale: true,
      // Dedupe requests within 2 seconds
      dedupingInterval: 2000,
    }
  )
  
  return {
    data,
    error,
    isLoading,
    mutate, // Function to manually trigger revalidation
  }
}

// Custom hook for chart data
export function useLangfuseChartData(startDate?: string, endDate?: string, selectedOrg?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (selectedOrg) params.set('selectedOrg', selectedOrg)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/langfuse-chart-data?${params}`,
    fetcherWithTimeout(110000),
    {
      keepPreviousData: true,
      refreshInterval: 5 * 60 * 1000,
      revalidateIfStale: true,
      dedupingInterval: 2000,
    }
  )
  
  return {
    data,
    error,
    isLoading,
    mutate,
  }
}

// Custom hook for database metrics
export function useDatabaseMetrics(startDate?: string, endDate?: string, orgId?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  if (orgId) params.set('orgId', orgId)
  
  const { data, error, isLoading, mutate } = useSWR(
    `/api/metrics?${params}`,
    fetcher,
    {
      keepPreviousData: true,
      refreshInterval: 5 * 60 * 1000,
      revalidateIfStale: true,
    }
  )
  
  return {
    data,
    error,
    isLoading,
    mutate,
  }
}

// Prefetch all dashboard data for instant navigation
export async function prefetchAllData() {
  // Common time ranges to prefetch
  const timeRanges = [
    { period: '24hours', startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), endDate: new Date().toISOString() },
    { period: '7days', startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date().toISOString() },
    { period: '1month', startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), endDate: new Date().toISOString() },
  ]
  
  const promises = []
  
  for (const range of timeRanges) {
    // Prefetch Langfuse metrics
    promises.push(
      fetch(`/api/langfuse-metrics?startDate=${range.startDate}&endDate=${range.endDate}`)
        .then(res => res.json())
        .catch(err => console.warn('Prefetch error:', err))
    )
    
    // Prefetch chart data
    promises.push(
      fetch(`/api/langfuse-chart-data?startDate=${range.startDate}&endDate=${range.endDate}`)
        .then(res => res.json())
        .catch(err => console.warn('Prefetch error:', err))
    )
  }
  
  // Execute all prefetches in parallel
  await Promise.all(promises)
  console.log('✅ Dashboard data prefetched for instant navigation')
}

// Hook to prefetch data on mount
export function usePrefetchDashboardData() {
  // Prefetch common data on component mount
  useSWR('prefetch-trigger', async () => {
    await prefetchAllData()
    return true
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })
}
