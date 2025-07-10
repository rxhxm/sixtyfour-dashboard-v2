'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { 
  Users, 
  Calendar, 
  Database, 
  BarChart3, 
  ChevronLeft, 
  ChevronRight,
  DollarSign,
  Activity,
  TrendingUp
} from 'lucide-react'
import { useState, useEffect } from 'react'
import { UsageMetrics } from '@/types/database'

type TimePeriod = 'days' | 'weeks' | 'months'
type DataSource = 'database' | 'langfuse'

function getTimeRange(period: TimePeriod, offset: number) {
  const now = new Date()
  
  let days: number
  let label: string
  
  switch (period) {
    case 'days':
      days = 1
      label = '24 Hours'
      break
    case 'weeks':
      days = 7
      label = '7 Days'
      break
    case 'months':
      days = 30
      label = '30 Days'
      break
    default:
      return { days: undefined, label: 'All Time' }
  }
  
  const endDate = new Date(now)
  endDate.setDate(endDate.getDate() + (offset * days))
  
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
    return `Previous ${timeRange.label}`
  } else {
    return `${Math.abs(offset)} ${period} ago`
  }
}

export default function OrganizationsPage() {
  const [metrics, setMetrics] = useState<UsageMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('days')
  const [timeOffset, setTimeOffset] = useState(0)
  const [dataSource, setDataSource] = useState<DataSource>('database')
  const [sortBy, setSortBy] = useState<'requests' | 'cost' | 'name'>('requests')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchData()
  }, [timePeriod, timeOffset, dataSource])

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
        
        console.log('Fetching Langfuse organizations data with params:', params.toString())
        
        const response = await fetch(`/api/langfuse-metrics?${params}`)
        if (response.ok) {
          const langfuseData = await response.json()
          
          const transformedMetrics: UsageMetrics = {
            totalRequests: langfuseData.summary.totalTraces,
            totalCost: langfuseData.summary.totalCost,
            totalTokens: langfuseData.summary.totalTokens || 0,
            averageResponseTime: 0,
            successRate: 100,
            organizationBreakdown: langfuseData.organizations.map((org: any) => ({
              org_id: org.name,
              org_name: org.name,
              requests: org.requests,
              cost: org.cost || 0,
              tokens: org.tokens || 0
            }))
          }
          
          setMetrics(transformedMetrics)
        }
      } else {
        // Fetch from database
        const timeRange = getTimeRange(timePeriod, timeOffset)
        const params = new URLSearchParams()
        
        if (timeRange.startDate && timeRange.endDate) {
          params.set('startDate', timeRange.startDate)
          params.set('endDate', timeRange.endDate)
        }
        
        console.log('Fetching database organizations data with params:', params.toString())
        
        const response = await fetch(`/api/metrics?${params}`)
        if (response.ok) {
          const metricsData = await response.json()
          setMetrics(metricsData)
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations data:', error)
    } finally {
      setLoading(false)
    }
  }

  const sortedOrganizations = metrics?.organizationBreakdown.sort((a, b) => {
    let aValue: number | string
    let bValue: number | string
    
    switch (sortBy) {
      case 'requests':
        aValue = a.requests
        bValue = b.requests
        break
      case 'cost':
        aValue = a.cost
        bValue = b.cost
        break
      case 'name':
        aValue = a.org_name
        bValue = b.org_name
        break
      default:
        aValue = a.requests
        bValue = b.requests
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  }) || []

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading organizations...</p>
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
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground">
              View and analyze API usage by organization
            </p>
          </div>
          
          {/* Data Source Toggle */}
          <div className="flex items-center space-x-2 bg-muted p-1 rounded-lg">
            <Button
              variant={dataSource === 'database' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDataSource('database')}
              className="flex items-center space-x-1"
            >
              <Database className="h-4 w-4" />
              <span>Database</span>
            </Button>
            <Button
              variant={dataSource === 'langfuse' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setDataSource('langfuse')}
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
                  setTimeOffset(0)
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
                
                <div className="flex items-center space-x-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTimeOffset(timeOffset - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="px-3 py-1 bg-muted rounded-md min-w-[120px] text-center">
                    <span className="text-sm font-medium">{getPeriodLabel(timePeriod, timeOffset)}</span>
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
              </div>

              {/* Sort Controls */}
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Sort by:</span>
                <Select value={sortBy} onValueChange={(value: 'requests' | 'cost' | 'name') => setSortBy(value)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="requests">Requests</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="flex items-center space-x-1"
                >
                  <TrendingUp className={`h-4 w-4 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                  <span>{sortOrder === 'asc' ? 'Asc' : 'Desc'}</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{sortedOrganizations.length}</div>
              <p className="text-xs text-muted-foreground">
                {dataSource === 'langfuse' ? 'Different trace types' : 'Active organizations'}
                {dataSource === 'langfuse' && (
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total {dataSource === 'langfuse' ? 'Traces' : 'Requests'}
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics?.totalRequests.toLocaleString() || '0'}</div>
              <p className="text-xs text-muted-foreground">
                Across all organizations
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
                Across all organizations
                {dataSource === 'langfuse' && (
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {dataSource === 'langfuse' ? 'Trace Types Detail' : 'Organizations Detail'}
            </CardTitle>
            <CardDescription>
              Detailed breakdown of API usage by {dataSource === 'langfuse' ? 'trace type' : 'organization'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sortedOrganizations.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      {dataSource === 'langfuse' ? 'Trace Type' : 'Organization Name'}
                    </TableHead>
                    <TableHead>{dataSource === 'langfuse' ? 'Trace Type ID' : 'Organization ID'}</TableHead>
                    <TableHead className="text-right">
                      {dataSource === 'langfuse' ? 'Traces' : 'Requests'}
                    </TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    {dataSource === 'langfuse' && (
                      <TableHead className="text-right">Tokens</TableHead>
                    )}
                    <TableHead className="text-right">% of Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedOrganizations.map((org) => {
                    const percentage = metrics?.totalRequests 
                      ? ((org.requests / metrics.totalRequests) * 100).toFixed(1)
                      : '0.0'
                    
                    return (
                      <TableRow key={org.org_id}>
                        <TableCell className="font-medium">{org.org_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {org.org_id}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {org.requests.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold">${org.cost.toFixed(2)}</span>
                        </TableCell>
                        {dataSource === 'langfuse' && (
                          <TableCell className="text-right">
                            {org.tokens?.toLocaleString() || '0'}
                          </TableCell>
                        )}
                        <TableCell className="text-right">
                          <Badge variant={parseFloat(percentage) > 10 ? 'default' : 'secondary'}>
                            {percentage}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No organizations found</h3>
                <p>No data available for the selected time period.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 