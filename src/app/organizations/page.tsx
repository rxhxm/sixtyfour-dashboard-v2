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
  // Database data state
  const [databaseMetrics, setDatabaseMetrics] = useState<UsageMetrics | null>(null)
  
  // Langfuse data state
  const [langfuseMetrics, setLangfuseMetrics] = useState<UsageMetrics | null>(null)
  
  // Shared state
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('days')
  const [timeOffset, setTimeOffset] = useState(0)
  const [sortBy, setSortBy] = useState<'requests' | 'cost' | 'name'>('requests')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  useEffect(() => {
    fetchData()
  }, [timePeriod, timeOffset])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const timeRange = getTimeRange(timePeriod, timeOffset)
      
      // Build query parameters for database
      const databaseParams = new URLSearchParams()
      if (timeRange.startDate && timeRange.endDate) {
        databaseParams.set('startDate', timeRange.startDate)
        databaseParams.set('endDate', timeRange.endDate)
      }
      
      // Build query parameters for Langfuse
      const langfuseParams = new URLSearchParams()
      if (timeRange.startDate && timeRange.endDate) {
        langfuseParams.set('startDate', timeRange.startDate)
        langfuseParams.set('endDate', timeRange.endDate)
      }
      if (timeRange.days) {
        langfuseParams.set('days', timeRange.days.toString())
      }
      
      console.log('Fetching both database and Langfuse organizations data...')
      
      // Fetch both database and Langfuse data in parallel
      const [databaseResponse, langfuseResponse] = await Promise.all([
        fetch(`/api/metrics?${databaseParams}`),
        fetch(`/api/langfuse-metrics?${langfuseParams}`)
      ])
      
      // Process database data
      if (databaseResponse.ok) {
        const databaseData = await databaseResponse.json()
        setDatabaseMetrics(databaseData)
      }
      
      // Process Langfuse data
      if (langfuseResponse.ok) {
        const langfuseData = await langfuseResponse.json()
        
        const transformedLangfuseMetrics: UsageMetrics = {
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
        
        setLangfuseMetrics(transformedLangfuseMetrics)
      }
    } catch (error) {
      console.error('Failed to fetch organizations data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSortedOrganizations = (metrics: UsageMetrics | null) => {
    return metrics?.organizationBreakdown.sort((a, b) => {
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
  }

  const databaseOrganizations = getSortedOrganizations(databaseMetrics)
  const langfuseOrganizations = getSortedOrganizations(langfuseMetrics)

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
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Organizations</h1>
            <p className="text-muted-foreground">
              Detailed view of API usage and costs by organization from both database and Langfuse
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
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* DATABASE SECTION */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold">Database Organizations</h2>
          </div>

          {/* Database Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Organizations</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMetrics?.organizationBreakdown.length || '0'}</div>
                <p className="text-xs text-muted-foreground">Active organizations</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{databaseMetrics?.totalRequests.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">{getPeriodLabel(timePeriod, timeOffset)}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${databaseMetrics?.totalCost.toFixed(2) || '0.00'}</div>
                <p className="text-xs text-muted-foreground">{getPeriodLabel(timePeriod, timeOffset)}</p>
              </CardContent>
            </Card>
          </div>

          {/* Database Organizations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Database Organizations Breakdown</CardTitle>
              <CardDescription>
                Detailed API usage and cost breakdown by organization from database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Avg Cost/Request</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {databaseOrganizations.map((org, index) => (
                    <TableRow key={`db-${org.org_id}-${index}`}>
                      <TableCell className="font-medium">{org.org_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{org.requests.toLocaleString()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${org.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        ${org.requests > 0 ? (org.cost / org.requests).toFixed(4) : '0.0000'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {databaseOrganizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No organizations found for the selected time period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* LANGFUSE SECTION */}
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-2xl font-bold">Langfuse Trace Types</h2>
          </div>

          {/* Langfuse Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Trace Types</CardTitle>
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

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{langfuseMetrics?.totalRequests.toLocaleString() || '0'}</div>
                <p className="text-xs text-muted-foreground">
                  {getPeriodLabel(timePeriod, timeOffset)}
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
                  {getPeriodLabel(timePeriod, timeOffset)}
                  <span className="ml-2 text-blue-600">• Langfuse</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Langfuse Organizations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Langfuse Trace Types Breakdown</CardTitle>
              <CardDescription>
                Detailed trace usage and cost breakdown by type from Langfuse
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Trace Type</TableHead>
                    <TableHead className="text-right">Traces</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Avg Cost/Trace</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {langfuseOrganizations.map((org, index) => (
                    <TableRow key={`langfuse-${org.org_id}-${index}`}>
                      <TableCell className="font-medium">{org.org_name}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">{org.requests.toLocaleString()}</Badge>
                      </TableCell>
                      <TableCell className="text-right">${org.cost.toFixed(2)}</TableCell>
                      <TableCell className="text-right">{org.tokens?.toLocaleString() || '0'}</TableCell>
                      <TableCell className="text-right">
                        ${org.requests > 0 ? (org.cost / org.requests).toFixed(4) : '0.0000'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {langfuseOrganizations.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No trace types found for the selected time period
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
} 