'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Activity, DollarSign, TrendingUp, Users, ChevronLeft, ChevronRight, Calendar, X, Database, BarChart3, CalendarDays } from 'lucide-react'
import { useState, useEffect } from 'react'
import { UsageChart } from '@/components/charts/usage-chart'
import { UsageMetrics } from '@/types/database'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'
import { DateRange } from 'react-day-picker'

type TimePeriod = 'days' | 'weeks' | 'months' | 'custom'

function getTimeRange(period: TimePeriod, offset: number, selectedDate?: Date, customRange?: DateRange) {
  const now = new Date()
  
  switch (period) {
    case 'days': {
      // Single day selection
      const targetDate = selectedDate || now
      const dayDate = new Date(targetDate)
      dayDate.setDate(dayDate.getDate() + offset)
      
      return {
        startDate: startOfDay(dayDate).toISOString(),
        endDate: endOfDay(dayDate).toISOString(),
        label: format(dayDate, 'MMM dd, yyyy')
      }
    }
    
    case 'weeks': {
      // Week selection
      const targetDate = selectedDate || now
      const weekDate = new Date(targetDate)
      weekDate.setDate(weekDate.getDate() + (offset * 7))
      
      const weekStart = startOfWeek(weekDate, { weekStartsOn: 1 }) // Monday start
      const weekEnd = endOfWeek(weekDate, { weekStartsOn: 1 })
      
      return {
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
        label: `${format(weekStart, 'MMM dd')} - ${format(weekEnd, 'MMM dd, yyyy')}`
      }
    }
    
    case 'months': {
      // Month selection
      const targetDate = selectedDate || now
      const monthDate = new Date(targetDate)
      monthDate.setMonth(monthDate.getMonth() + offset)
      
      const monthStart = startOfMonth(monthDate)
      const monthEnd = endOfMonth(monthDate)
      
      return {
        startDate: monthStart.toISOString(),
        endDate: monthEnd.toISOString(),
        label: format(monthDate, 'MMMM yyyy')
      }
    }
    
    case 'custom': {
      // Custom range selection
      if (customRange?.from && customRange?.to) {
        return {
          startDate: startOfDay(customRange.from).toISOString(),
          endDate: endOfDay(customRange.to).toISOString(),
          label: `${format(customRange.from, 'MMM dd')} - ${format(customRange.to, 'MMM dd, yyyy')}`
        }
      }
      // Default to last 7 days if no custom range selected
      const endDate = endOfDay(now)
      const startDate = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
      return {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        label: 'Last 7 days'
      }
    }
    
    default:
      return { 
        startDate: undefined, 
        endDate: undefined, 
        label: 'All Time' 
      }
  }
}

function getPeriodLabel(period: TimePeriod, offset: number, selectedDate?: Date, customRange?: DateRange) {
  const timeRange = getTimeRange(period, offset, selectedDate, customRange)
  return timeRange.label
}

export default function DashboardPage() {
  // Database data state
  const [databaseMetrics, setDatabaseMetrics] = useState<UsageMetrics | null>(null)
  const [databaseChartData, setDatabaseChartData] = useState<any[]>([])
  
  // Langfuse data state
  const [langfuseMetrics, setLangfuseMetrics] = useState<UsageMetrics | null>(null)
  const [langfuseChartData, setLangfuseChartData] = useState<any[]>([])
  
  // Shared state
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('days')
  const [timeOffset, setTimeOffset] = useState(0) // 0 = current period, -1 = previous, etc.
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined)
  const [showDatePicker, setShowDatePicker] = useState(false)

  useEffect(() => {
    fetchData()
  }, [timePeriod, timeOffset, selectedOrg, selectedDate, customRange])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const timeRange = getTimeRange(timePeriod, timeOffset, selectedDate, customRange)
      
      // Build query parameters for database
      const databaseParams = new URLSearchParams()
      if (timeRange.startDate && timeRange.endDate) {
        databaseParams.set('startDate', timeRange.startDate)
        databaseParams.set('endDate', timeRange.endDate)
      }
      if (selectedOrg) {
        databaseParams.set('orgId', selectedOrg)
      }
      
      // Build query parameters for Langfuse
      const langfuseParams = new URLSearchParams()
      if (timeRange.startDate && timeRange.endDate) {
        langfuseParams.set('startDate', timeRange.startDate)
        langfuseParams.set('endDate', timeRange.endDate)
      }
      if (selectedOrg && selectedOrg !== '') {
        langfuseParams.set('selectedOrg', selectedOrg)
      }
      
      console.log('Fetching both database and Langfuse data...')
      
      // Fetch both database and Langfuse data in parallel
      const [
        databaseMetricsResponse,
        databaseChartResponse,
        langfuseResponse
      ] = await Promise.all([
        fetch(`/api/metrics?${databaseParams}`),
        fetch(`/api/charts-optimized?${databaseParams}`),
        fetch(`/api/langfuse-metrics?${langfuseParams}`)
      ])
      
      // Process database data
      if (databaseMetricsResponse.ok) {
        const databaseData = await databaseMetricsResponse.json()
        setDatabaseMetrics(databaseData)
      }
      
      if (databaseChartResponse.ok) {
        const databaseChartResult = await databaseChartResponse.json()
        setDatabaseChartData(databaseChartResult)
      }
      
      // Process Langfuse data
      if (langfuseResponse.ok) {
        const langfuseData = await langfuseResponse.json()
        console.log('Langfuse data received:', langfuseData)
        
        // Transform Langfuse data to match existing metrics format
        const transformedLangfuseMetrics: UsageMetrics = {
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
        
        setLangfuseMetrics(transformedLangfuseMetrics)
        setLangfuseChartData(langfuseData.chartData || [])
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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Overview</h1>
            <p className="text-muted-foreground">
              Monitor your API usage, costs, and performance metrics from both database and Langfuse
            </p>
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
                  setShowDatePicker(false) // Close any open date picker
                }}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Date Picker for Days, Weeks, Months */}
                {timePeriod !== 'custom' && (
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <CalendarDays className="h-4 w-4" />
                        <span>Select {timePeriod.slice(0, -1)}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={selectedDate}
                        onSelect={(date) => {
                          if (date) {
                            setSelectedDate(date)
                            setTimeOffset(0)
                            setShowDatePicker(false)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                
                {/* Custom Range Picker */}
                {timePeriod === 'custom' && (
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center space-x-1"
                      >
                        <CalendarDays className="h-4 w-4" />
                        <span>Select Range</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="range"
                        selected={customRange}
                        onSelect={(range) => {
                          setCustomRange(range)
                          if (range?.from && range?.to) {
                            setShowDatePicker(false)
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                )}
                
                {/* Navigation arrows (only for non-custom periods) */}
                {timePeriod !== 'custom' && (
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTimeOffset(timeOffset - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <div className="px-3 py-1 bg-muted rounded-md min-w-[120px] text-center">
                      <span className="text-sm font-medium">{getPeriodLabel(timePeriod, timeOffset, selectedDate, customRange)}</span>
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
                
                {/* Custom range display */}
                {timePeriod === 'custom' && (
                  <div className="px-3 py-1 bg-muted rounded-md">
                    <span className="text-sm font-medium">{getPeriodLabel(timePeriod, timeOffset, selectedDate, customRange)}</span>
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

        {/* DATABASE SECTION */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Database Metrics</h2>
          </div>

          {/* Database Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMetrics?.totalRequests.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodLabel(timePeriod, timeOffset, selectedDate, customRange)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${databaseMetrics?.totalCost.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodLabel(timePeriod, timeOffset, selectedDate, customRange)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMetrics?.successRate.toFixed(1) || '0.0'}%</div>
                <p className="text-xs text-muted-foreground">HTTP 2xx responses</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMetrics?.organizationBreakdown.length || '0'}</div>
                <p className="text-xs text-muted-foreground">Active organizations</p>
              </CardContent>
            </Card>
          </div>

          {/* Database Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Database API Usage Trends</CardTitle>
                <CardDescription>
                  Daily API requests and costs over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UsageChart data={databaseChartData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Organizations (Database)</CardTitle>
                <CardDescription>
                  API usage by organization from database
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(databaseMetrics?.organizationBreakdown || [])
                    .slice()
                    .sort((a, b) => b.requests - a.requests)
                    .map((org, index) => (
                    <div 
                      key={`db-${org.org_id}-${org.requests}-${index}`} 
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
                
                {databaseMetrics?.organizationBreakdown.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No organizations found for the selected time period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* LANGFUSE SECTION */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-2xl font-bold">Langfuse Metrics</h2>
          </div>

          {/* Langfuse Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{langfuseMetrics?.totalRequests.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodLabel(timePeriod, timeOffset, selectedDate, customRange)}
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${langfuseMetrics?.totalCost.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodLabel(timePeriod, timeOffset, selectedDate, customRange)}
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{langfuseMetrics?.totalTokens?.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  Token usage
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trace Types</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{langfuseMetrics?.organizationBreakdown.length || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  Different trace types
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Langfuse Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Langfuse Usage Trends</CardTitle>
                <CardDescription>
                  Daily traces and costs over time from Langfuse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UsageChart data={langfuseChartData} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Trace Types (Langfuse)</CardTitle>
                <CardDescription>
                  Usage by trace type from Langfuse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(langfuseMetrics?.organizationBreakdown || [])
                    .slice()
                    .sort((a, b) => b.requests - a.requests)
                    .map((org, index) => (
                    <div 
                      key={`langfuse-${org.org_id}-${org.requests}-${index}`} 
                      className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all hover:bg-muted/50 ${
                        selectedOrg === org.org_id ? 'bg-blue-50 border border-blue-200' : ''
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
                          selectedOrg === org.org_id ? 'bg-blue-600' : 'bg-muted-foreground'
                        }`}></div>
                        <span className={`text-sm font-medium ${
                          selectedOrg === org.org_id ? 'text-blue-600' : ''
                        }`}>
                          {org.org_name}
                        </span>
                        {selectedOrg === org.org_id && (
                          <Badge variant="default" className="text-xs bg-blue-600">
                            Selected
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary">{org.requests.toLocaleString()} traces</Badge>
                        <span className="text-sm text-muted-foreground">${org.cost.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                
                {langfuseMetrics?.organizationBreakdown.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No trace types found for the selected time period
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
    </div>
    </DashboardLayout>
  )
}
