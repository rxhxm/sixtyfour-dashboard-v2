'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, Activity, DollarSign, TrendingUp, Users, AlertCircle, Bug, Download, RefreshCw } from 'lucide-react'
import { LangfuseAreaChart } from "@/components/charts/langfuse-area-chart"
import { useRouter } from 'next/navigation'

// Performance logger
class ClientLogger {
  logs: any[] = []
  
  log(message: string, details?: any) {
    const entry = {
      timestamp: new Date().toISOString(),
      message,
      details,
      elapsed: performance.now()
    }
    this.logs.push(entry)
    console.log(`[CLIENT ${entry.elapsed.toFixed(2)}ms] ${message}`, details || '')
  }
  
  clear() {
    this.logs = []
  }
  
  export() {
    return JSON.stringify(this.logs, null, 2)
  }
}

const clientLogger = new ClientLogger()

export default function DashboardDebugPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [chartData, setChartData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [timePeriod, setTimePeriod] = useState('24hours')
  const [logs, setLogs] = useState<string[]>([])
  const [fetchStats, setFetchStats] = useState<any>(null)
  
  // Add log entry
  const addLog = (message: string, details?: any) => {
    const timestamp = new Date().toISOString()
    const logEntry = `[${timestamp}] ${message} ${details ? JSON.stringify(details) : ''}`
    setLogs(prev => [...prev, logEntry])
    console.log(logEntry)
    clientLogger.log(message, details)
  }
  
  // Check authentication
  useEffect(() => {
    addLog('Checking authentication')
    const isAuthenticated = sessionStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      addLog('Not authenticated, redirecting')
      router.push('/auth/signin')
    } else {
      addLog('Authenticated, proceeding')
    }
  }, [router])
  
  // Fetch data with detailed logging
  const fetchData = async () => {
    const fetchId = `fetch-${Date.now()}`
    const startTime = performance.now()
    
    addLog('Starting data fetch', { fetchId, timePeriod })
    setLoading(true)
    setError(null)
    
    try {
      // Calculate date range
      const now = new Date()
      let startDate, endDate
      
      if (timePeriod === '24hours') {
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        endDate = now
      } else if (timePeriod === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        endDate = now
      } else {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        endDate = now
      }
      
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      })
      
      addLog('Fetching langfuse metrics', { url: `/api/langfuse-metrics?${params}` })
      
      // Fetch with detailed timing
      const metricsStartTime = performance.now()
      const metricsResponse = await fetch(`/api/langfuse-metrics?${params}`, {
        signal: AbortSignal.timeout(110000) // 110 second timeout
      })
      const metricsTime = performance.now() - metricsStartTime
      
      addLog('Metrics response received', {
        status: metricsResponse.status,
        duration: `${metricsTime.toFixed(2)}ms`,
        ok: metricsResponse.ok
      })
      
      if (!metricsResponse.ok) {
        throw new Error(`HTTP ${metricsResponse.status}`)
      }
      
      const metricsData = await metricsResponse.json()
      addLog('Metrics data parsed', {
        organizations: metricsData?.organizations?.length,
        totalTraces: metricsData?.summary?.totalTraces,
        totalCost: metricsData?.summary?.totalCost
      })
      
      // Fetch chart data
      addLog('Fetching chart data', { url: `/api/langfuse-chart-data?${params}` })
      
      const chartStartTime = performance.now()
      const chartResponse = await fetch(`/api/langfuse-chart-data?${params}`, {
        signal: AbortSignal.timeout(110000)
      })
      const chartTime = performance.now() - chartStartTime
      
      addLog('Chart response received', {
        status: chartResponse.status,
        duration: `${chartTime.toFixed(2)}ms`,
        ok: chartResponse.ok
      })
      
      if (!chartResponse.ok) {
        throw new Error(`Chart HTTP ${chartResponse.status}`)
      }
      
      const chartDataResult = await chartResponse.json()
      addLog('Chart data parsed', {
        dataPoints: chartDataResult?.length
      })
      
      // Calculate total time
      const totalTime = performance.now() - startTime
      
      const stats = {
        totalDuration: `${totalTime.toFixed(2)}ms`,
        metricsDuration: `${metricsTime.toFixed(2)}ms`,
        chartDuration: `${chartTime.toFixed(2)}ms`,
        organizations: metricsData?.organizations?.length || 0,
        traces: metricsData?.summary?.totalTraces || 0,
        dataPoints: chartDataResult?.length || 0
      }
      
      addLog('✅ Data fetch complete', stats)
      setFetchStats(stats)
      
      setData(metricsData)
      setChartData(chartDataResult)
      
    } catch (err) {
      const totalTime = performance.now() - startTime
      addLog('❌ Fetch error', {
        error: err instanceof Error ? err.message : 'Unknown error',
        duration: `${totalTime.toFixed(2)}ms`
      })
      setError(err instanceof Error ? err.message : 'Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }
  
  // Download logs
  const downloadLogs = () => {
    const logData = {
      timestamp: new Date().toISOString(),
      logs: logs,
      clientLogs: clientLogger.logs,
      fetchStats,
      currentData: {
        hasData: !!data,
        organizations: data?.organizations?.length,
        traces: data?.summary?.totalTraces
      }
    }
    
    const blob = new Blob([JSON.stringify(logData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `dashboard-debug-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Bug className="h-8 w-8 text-red-500" />
              Debug Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">
              Performance monitoring and logging enabled
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadLogs}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clientLogger.clear()
                setLogs([])
                addLog('Logs cleared')
              }}
            >
              Clear Logs
            </Button>
          </div>
        </div>
        
        {/* Controls */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Controls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24hours">Past 24 Hours</SelectItem>
                  <SelectItem value="7days">Past 7 Days</SelectItem>
                  <SelectItem value="1month">Past Month</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Fetch Data
                  </>
                )}
              </Button>
              
              {fetchStats && (
                <div className="flex items-center gap-4 text-sm">
                  <Badge variant="outline">Total: {fetchStats.totalDuration}</Badge>
                  <Badge variant="outline">Metrics: {fetchStats.metricsDuration}</Badge>
                  <Badge variant="outline">Chart: {fetchStats.chartDuration}</Badge>
                </div>
              )}
            </div>
            
            {error && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-md">
                Error: {error}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Metrics */}
        {data && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.summary?.totalTraces?.toLocaleString() || '0'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${data?.summary?.totalCost?.toFixed(2) || '0.00'}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data?.organizations?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Chart */}
        {chartData && (
          <Card>
            <CardHeader>
              <CardTitle>Metrics Over Time</CardTitle>
              <CardDescription>Data points: {chartData?.length || 0}</CardDescription>
            </CardHeader>
            <CardContent>
              <LangfuseAreaChart 
                data={chartData || []}
                title=""
                description=""
                timePeriod={timePeriod}
              />
            </CardContent>
          </Card>
        )}
        
        {/* Debug Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Debug Logs ({logs.length})</span>
              <Badge variant="outline">
                <AlertCircle className="h-3 w-3 mr-1" />
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-black text-green-400 font-mono text-xs p-4 rounded-md max-h-96 overflow-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500">No logs yet. Click "Fetch Data" to start.</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="mb-1 hover:bg-gray-900">
                    {log}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
