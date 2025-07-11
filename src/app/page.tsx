'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, DollarSign, TrendingUp, Users, ChevronLeft, ChevronRight, Calendar, X, Database, BarChart3 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { UsageChart } from '@/components/charts/usage-chart'
import { UsageMetrics } from '@/types/database'
import { DateRangePicker } from '@/components/ui/date-range-picker'

type TimePeriod = 'days' | 'weeks' | 'months'
type DataSource = 'database' | 'langfuse'

function getTimeRange(period: TimePeriod, offset: number) {
  const now = new Date()
  
  let days: number
  let label: string
  let stepSize: number
  
  switch (period) {
    case 'days':
      days = 7  // Show 7 days of data
      stepSize = 1  // Navigate by 1 day
      label = '7 Days'
      break
    case 'weeks':
      days = 7
      stepSize = 7  // Navigate by 1 week
      label = '7 Days'
      break
    case 'months':
      days = 30
      stepSize = 30  // Navigate by 1 month
      label = '30 Days'
      break
    default:
      return { days: undefined, label: 'All Time' }
  }
  
  // Calculate the actual date range based on offset
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + (offset * stepSize))
  
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - days + 1)
  
  return { 
    days, 
    label,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  }
}

function getPeriodLabel(period: TimePeriod, offset: number) {
  const timeRange = getTimeRange(period, offset)
  
  if (offset === 0) {
    return `Current ${timeRange.label}`
  } else if (offset === -1) {
    if (period === 'days') {
      return `Yesterday (7 days)`
    } else {
      return `Previous ${timeRange.label}`
    }
  } else {
    if (period === 'days') {
      return `${Math.abs(offset)} days ago (7 days)`
    } else {
      return `${Math.abs(offset)} ${period} ago`
    }
  }
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('days')
  const [timeOffset, setTimeOffset] = useState(0) // 0 = current period, -1 = previous, etc.
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [dataSource, setDataSource] = useState<DataSource>('database')
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>(undefined)
  const [useCustomRange, setUseCustomRange] = useState(false)

  // Helper function to get the current period label
  const getCurrentPeriodLabel = () => {
    if (useCustomRange && customDateRange?.from && customDateRange?.to) {
      return `${format(customDateRange.from, 'MMM dd')} - ${format(customDateRange.to, 'MMM dd, yyyy')}`
    }
    return getPeriodLabel(timePeriod, timeOffset)
  }

  useEffect(() => {
    fetchData()
  }, [timePeriod, timeOffset, selectedOrg, dataSource, customDateRange, useCustomRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      if (dataSource === 'langfuse') {
        // Fetch from Langfuse API
        const timeRange = getTimeRange(timePeriod, timeOffset)
        const params = new URLSearchParams()
        
        if (timeRange.startDate && timeRange.endDate) {
          params.set('startDate', timeRange.startDate)
          params.set('endDate', timeRange.endDate)
        }
        if (timeRange.days) {
          params.set('days', timeRange.days.toString())
        }
        if (selectedOrg && selectedOrg !== '') {
          params.set('selectedOrg', selectedOrg)
        }
        
        console.log('Fetching Langfuse data with params:', params.toString())
        
        const response = await fetch(`/api/langfuse-metrics?${params}`)
        if (response.ok) {
          const langfuseData = await response.json()
          console.log('Langfuse data received:', langfuseData)
          
          // Transform Langfuse data to match existing metrics format
          const transformedMetrics: UsageMetrics = {
            totalRequests: langfuseData.summary.totalTraces,
            totalCost: langfuseData.summary.totalCost,
            totalTokens: langfuseData.summary.totalTokens || 0,
            averageResponseTime: 0, // Not available in Langfuse daily metrics
            successRate: 100, // Langfuse tracks successful traces
            organizationBreakdown: langfuseData.organizations.map((org: any) => ({
              org_id: org.name,
              org_name: org.name,
              requests: org.requests,
              cost: org.cost || 0,
              tokens: org.tokens || 0
            }))
          }
          
          setMetrics(transformedMetrics)
          setChartData(langfuseData.chartData || [])
        }
      } else {
        // Fetch from database (original logic)
        let startDate: string | undefined
        let endDate: string | undefined
        
        if (useCustomRange && customDateRange?.from && customDateRange?.to) {
          // Use custom date range
          startDate = customDateRange.from.toISOString()
          endDate = customDateRange.to.toISOString()
        } else {
          // Use calculated time range
          const timeRange = getTimeRange(timePeriod, timeOffset)
          startDate = timeRange.startDate
          endDate = timeRange.endDate
        }
        
        // Build query parameters
        const params = new URLSearchParams()
        if (startDate && endDate) {
          params.set('startDate', startDate)
          params.set('endDate', endDate)
        }
        if (selectedOrg) {
          params.set('orgId', selectedOrg)
        }
        
        console.log('Fetching database data with params:', params.toString())
        
        // Fetch metrics and chart data in parallel
        const [metricsResponse, chartResponse] = await Promise.all([
          fetch(`/api/metrics?${params}`),
          fetch(`/api/charts-optimized?${params}`)
        ])
        
        if (metricsResponse.ok) {
          const metricsData = await metricsResponse.json()
          setMetrics(metricsData)
        }
        
        if (chartResponse.ok) {
          const chartDataResult = await chartResponse.json()
          setChartData(chartDataResult)
        }
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">
              Monitor your API usage, costs, and performance metrics
            </p>
          </div>
          
          {/* Data Source Toggle */}
          <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
            <Button
              variant={dataSource === 'database' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setDataSource('database')
                setSelectedOrg('') // Reset organization filter when switching
              }}
              className="flex items-center space-x-1"
            >
              <Database className="h-4 w-4" />
              <span>Database</span>
            </Button>
            <Button
              variant={dataSource === 'langfuse' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => {
                setDataSource('langfuse')
                setSelectedOrg('') // Reset organization filter when switching
              }}
              className="flex items-center space-x-1"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Langfuse</span>
            </Button>
          </div>
        </div>

        {/* Time Period Controls */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Time Period:</span>
                </div>
                
                <Select value={timePeriod} onValueChange={(value: TimePeriod) => {
                  setTimePeriod(value)
                  setTimeOffset(0) // Reset to current period when changing time period
                  setUseCustomRange(false) // Reset custom range when changing time period
                  setCustomDateRange(undefined)
                }}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Show date range picker only for Days */}
                {timePeriod === 'days' && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={useCustomRange ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setUseCustomRange(!useCustomRange)
                        if (useCustomRange) {
                          setCustomDateRange(undefined)
                        }
                      }}
                    >
                      {useCustomRange ? 'Using Custom Range' : 'Custom Range'}
                    </Button>
                    
                    {useCustomRange && (
                      <DateRangePicker
                        date={customDateRange}
                        onDateChange={(date) => setCustomDateRange(date)}
                        placeholder="Select date range"
                      />
                    )}
                  </div>
                )}
                
                {/* Show navigation controls only when not using custom range */}
                {!useCustomRange && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimeOffset(timeOffset - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="px-3 py-1 bg-muted rounded-md min-w-[120px] text-center">
                      <span className="text-sm font-medium">{getCurrentPeriodLabel()}</span>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimeOffset(timeOffset + 1)}
                      disabled={timeOffset >= 0}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Selected Organization Filter */}
              {selectedOrg && (
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className="flex items-center space-x-1">
                    <Users className="h-3 w-3" />
                    <span>{selectedOrg}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 ml-1"
                      onClick={() => setSelectedOrg('')}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dataSource === 'langfuse' ? 'Total Traces' : 'Total Requests'}
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalRequests.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground">
                {getCurrentPeriodLabel()}
                {dataSource === 'langfuse' && (
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics?.totalCost.toFixed(2) || '0.00'}</div>
              <p className="text-xs text-muted-foreground">
                {getCurrentPeriodLabel()}
                {dataSource === 'langfuse' && (
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dataSource === 'langfuse' ? 'Total Tokens' : 'Success Rate'}
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {dataSource === 'langfuse' 
                  ? (metrics?.totalTokens?.toLocaleString() || '0')
                  : `${metrics?.successRate.toFixed(1) || '0.0'}%`
                }
              </div>
              <p className="text-xs text-muted-foreground">
                {dataSource === 'langfuse' ? 'Token usage' : 'HTTP 2xx responses'}
                {dataSource === 'langfuse' && (
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {dataSource === 'langfuse' ? 'Trace Types' : 'Organizations'}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.organizationBreakdown.length || '0'}</div>
              <p className="text-xs text-muted-foreground">
                {dataSource === 'langfuse' ? 'Different trace types' : 'Active organizations'}
                {dataSource === 'langfuse' && (
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>API Usage Trends</CardTitle>
              <CardDescription>
                Daily API requests and costs over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UsageChart data={chartData} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {dataSource === 'langfuse' ? 'Top Trace Types' : 'Top Organizations'}
              </CardTitle>
              <CardDescription>
                {dataSource === 'langfuse' ? 'Usage by trace type' : 'API usage by organization'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(metrics?.organizationBreakdown || [])
                  .slice()
                  .sort((a, b) => b.requests - a.requests)
                  .map((org, index) => (
                  <div 
                    key={`${org.org_id}-${org.requests}-${index}`} 
                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                      selectedOrg === org.org_id ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                    onClick={() => {
                      if (selectedOrg === org.org_id) {
                        setSelectedOrg('') // Deselect if already selected
                      } else {
                        setSelectedOrg(org.org_id) // Select this organization
                      }
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        selectedOrg === org.org_id ? 'bg-primary' : 'bg-muted-foreground'
                      }`}></div>
                      <span className={`text-sm font-medium ${
                        selectedOrg === org.org_id ? 'text-primary' : ''
                      }`}>
                        {org.org_name}
                      </span>
                      {selectedOrg === org.org_id && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">{org.requests.toLocaleString()} requests</Badge>
                      <span className="text-sm text-muted-foreground">${org.cost.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              {metrics?.organizationBreakdown.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No organizations found for the selected time period
                </div>
              )}
            </CardContent>
          </Card>
        </div>
    </div>
    </DashboardLayout>
  )
}
