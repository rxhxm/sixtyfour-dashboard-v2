'use client'

import useSWR, { mutate } from 'swr'
import { fetcherWithTimeout } from '@/lib/swr-config'
import { useMemo } from 'react'

// Types for our data
interface LangfuseMetrics {
  summary: {
    totalTraces: number
    totalCost: number
    totalTokens: number
  }
  organizations: Array<{
    org_id: string
    org_name: string
    name: string
    key_name?: string
    requests: number
    cost: number
    tokens: number
    traceTypes?: Record<string, number>
  }>
  organizationBreakdown?: Array<any>
}

interface ChartData {
  time: string
  traces: number
  cost: number
  tokens: number
}

// Master hook that fetches ALL data and caches it
export function useDashboardMasterData(startDate?: string, endDate?: string) {
  const params = new URLSearchParams()
  if (startDate) params.set('startDate', startDate)
  if (endDate) params.set('endDate', endDate)
  
  // Fetch ALL data without any org filter
  const { data: langfuseMetrics, error: metricsError, isLoading: metricsLoading } = useSWR<LangfuseMetrics>(
    `/api/langfuse-metrics?${params}`,
    fetcherWithTimeout(110000),
    {
      revalidateOnFocus: false, // Don't refetch on focus
      revalidateOnReconnect: false, // Don't refetch on reconnect
      refreshInterval: 5 * 60 * 1000, // Refresh every 5 minutes
      dedupingInterval: 60000, // Dedupe for 60 seconds
      keepPreviousData: true,
    }
  )
  
  const { data: chartData, error: chartError, isLoading: chartLoading } = useSWR<ChartData[]>(
    `/api/langfuse-chart-data?${params}`,
    fetcherWithTimeout(110000),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 5 * 60 * 1000,
      dedupingInterval: 60000,
      keepPreviousData: true,
    }
  )
  
  return {
    langfuseMetrics,
    chartData,
    isLoading: metricsLoading || chartLoading,
    error: metricsError || chartError,
  }
}

// Hook for filtered data (filters client-side for instant results)
export function useFilteredDashboardData(
  startDate?: string,
  endDate?: string,
  selectedOrg?: string
) {
  // Get the master data
  const { langfuseMetrics, chartData, isLoading, error } = useDashboardMasterData(startDate, endDate)
  
  // Filter data client-side (INSTANT!)
  const filteredData = useMemo(() => {
    if (!selectedOrg || !langfuseMetrics) {
      return { langfuseMetrics, chartData }
    }
    
    // Find the selected organization
    const selectedOrgData = langfuseMetrics.organizations?.find(
      org => org.org_id === selectedOrg
    )
    
    if (!selectedOrgData) {
      return { langfuseMetrics, chartData }
    }
    
    // Create filtered metrics (client-side, instant!)
    const filteredMetrics: LangfuseMetrics = {
      summary: {
        totalTraces: selectedOrgData.requests || 0,
        totalCost: selectedOrgData.cost || 0,
        totalTokens: selectedOrgData.tokens || 0,
      },
      organizations: [selectedOrgData],
      organizationBreakdown: langfuseMetrics.organizationBreakdown?.filter(
        (org: any) => org.org_id === selectedOrg
      ),
    }
    
    // For chart data, we would need trace-level timestamps to filter properly
    // For now, we'll scale the chart proportionally (this is an approximation)
    const scaleFactor = selectedOrgData.requests / (langfuseMetrics.summary?.totalTraces || 1)
    const filteredChart = chartData?.map(point => ({
      ...point,
      traces: Math.round(point.traces * scaleFactor),
      cost: point.cost * scaleFactor,
      tokens: Math.round(point.tokens * scaleFactor),
    }))
    
    return {
      langfuseMetrics: filteredMetrics,
      chartData: filteredChart,
    }
  }, [langfuseMetrics, chartData, selectedOrg])
  
  return {
    ...filteredData,
    isLoading,
    error,
    isFiltered: !!selectedOrg,
  }
}

// Prefetch all common time ranges on app load
export async function prefetchAllDashboardData() {
  const timeRanges = [
    {
      period: '24hours',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      period: '7days',
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
    {
      period: '1month',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
    },
  ]
  
  console.log('🚀 Prefetching dashboard data for all time ranges...')
  
  for (const range of timeRanges) {
    const params = new URLSearchParams()
    params.set('startDate', range.startDate)
    params.set('endDate', range.endDate)
    
    // Prefetch and populate SWR cache
    const metricsKey = `/api/langfuse-metrics?${params}`
    const chartKey = `/api/langfuse-chart-data?${params}`
    
    // Fetch in parallel
    const [metricsData, chartData] = await Promise.all([
      fetch(metricsKey).then(res => res.json()).catch(() => null),
      fetch(chartKey).then(res => res.json()).catch(() => null),
    ])
    
    // Populate SWR cache manually
    if (metricsData) {
      mutate(metricsKey, metricsData, false)
    }
    if (chartData) {
      mutate(chartKey, chartData, false)
    }
    
    console.log(`✅ Prefetched ${range.period} data`)
  }
  
  console.log('✅ All dashboard data prefetched and cached!')
}

// Hook to trigger prefetch on mount
export function usePrefetchOnMount() {
  useSWR('prefetch-all-data', prefetchAllDashboardData, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    revalidateIfStale: false,
  })
}
