'use client'

import { useState, useEffect, useMemo } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calendar, ChevronDown, Activity, DollarSign, TrendingUp, Users, AlertCircle, ChevronRight, Copy, Check, Loader2, Zap } from 'lucide-react'
import { LangfuseAreaChart } from "@/components/charts/langfuse-area-chart"
import { useFilteredDashboardData, usePrefetchOnMount } from '@/hooks/use-dashboard-data-optimized'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Time period type
type TimePeriod = '24hours' | '7days' | '1month'

// Helper function to get time range
function getTimeRange(period: TimePeriod) {
  const now = new Date()
  const ranges: Record<TimePeriod, { startDate: string; endDate: string }> = {
    '24hours': {
      startDate: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: now.toISOString()
    },
    '7days': {
      startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: now.toISOString()
    },
    '1month': {
      startDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: now.toISOString()
    }
  }
  
  return ranges[period]
}

export default function DashboardFastPage() {
  const router = useRouter()
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('24hours')
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [expandedOrg, setExpandedOrg] = useState<string>('')
  const [copiedKey, setCopiedKey] = useState<string>('')
  const [showTraceModal, setShowTraceModal] = useState(false)
  
  // Check authentication
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated')
    if (!isAuthenticated) {
      router.push('/auth/signin')
    }
  }, [router])
  
  // Prefetch all data on mount
  usePrefetchOnMount()
  
  // Get time range based on selected period
  const timeRange = getTimeRange(timePeriod)
  
  // Use the optimized hook with client-side filtering
  const { 
    langfuseMetrics, 
    chartData, 
    isLoading,
    error,
    isFiltered
  } = useFilteredDashboardData(timeRange.startDate, timeRange.endDate, selectedOrg)
  
  // Get the full organization list (unfiltered) for the table
  const [fullOrgList, setFullOrgList] = useState<any[]>([])
  
  // Store full org list when not filtered
  useEffect(() => {
    if (!isFiltered && langfuseMetrics?.organizations) {
      setFullOrgList(langfuseMetrics.organizations)
    }
  }, [langfuseMetrics, isFiltered])
  
  // Copy to clipboard function
  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyId)
    setTimeout(() => setCopiedKey(''), 2000)
  }
  
  // Format date for display
  const formatDateRange = () => {
    const start = new Date(timeRange.startDate)
    const end = new Date(timeRange.endDate)
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
  }
  
  // Handle org selection (instant filtering!)
  const handleOrgClick = (orgId: string) => {
    if (selectedOrg === orgId) {
      // Deselect
      setSelectedOrg('')
      setExpandedOrg('')
    } else {
      // Select (instant client-side filtering!)
      setSelectedOrg(orgId)
      setExpandedOrg(orgId)
    }
  }
  
  // Get selected org data for details
  const selectedOrgData = useMemo(() => {
    if (!expandedOrg || !fullOrgList.length) return null
    return fullOrgList.find(org => org.org_id === expandedOrg)
  }, [expandedOrg, fullOrgList])
  
  // Show loading state only on first load
  if (isLoading && !langfuseMetrics) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Loading dashboard...</p>
              <p className="text-xs text-muted-foreground">First load caches everything for instant navigation</p>
            </div>
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
            <p className="text-muted-foreground mt-1">
              Instant client-side filtering with SWR
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              <Zap className="h-3 w-3 mr-1 text-yellow-500" />
              Instant Mode
            </Badge>
            {isLoading && langfuseMetrics && (
              <Badge variant="secondary" className="px-3 py-1">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Refreshing
              </Badge>
            )}
          </div>
        </div>
        
        {/* Time Period Selector */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{formatDateRange()}</span>
            {selectedOrg && (
              <Badge variant="default" className="ml-2">
                Filtered: {selectedOrgData?.org_name || selectedOrg}
              </Badge>
            )}
          </div>
          <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24hours">Past 24 Hours</SelectItem>
              <SelectItem value="7days">Past 7 Days</SelectItem>
              <SelectItem value="1month">Past Month</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Metrics Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Traces</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {langfuseMetrics?.summary?.totalTraces?.toLocaleString() || '0'}
              </div>
              {selectedOrg && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedOrgData?.org_name || selectedOrg}
                </p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${langfuseMetrics?.summary?.totalCost?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {timePeriod.replace(/(\d+)/, ' $1 ')}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {langfuseMetrics?.summary?.totalTokens?.toLocaleString() || '0'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Token usage
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Langfuse Metrics Over Time</CardTitle>
                <CardDescription>
                  {selectedOrg ? `Filtered by ${selectedOrgData?.org_name || selectedOrg}` : 'All organizations'}
                </CardDescription>
              </div>
              {selectedOrg && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrg('')
                    setExpandedOrg('')
                  }}
                >
                  Clear Filter
                </Button>
              )}
            </div>
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
        
        {/* Organizations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  API Users Leaderboard ({fullOrgList.length || 0})
                </CardTitle>
                <CardDescription>
                  Click for instant filtering • No loading delays
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-xs">
                Client-side filtering
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-2 text-left">Org ID</th>
                    <th className="p-2 text-left">Name</th>
                    <th className="p-2 text-left">API Key</th>
                    <th className="p-2 text-right">Traces</th>
                    <th className="p-2 text-right">Total Cost</th>
                    <th className="p-2 text-right">Tokens</th>
                    <th className="p-2 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedOrg ? langfuseMetrics?.organizations : fullOrgList)?.map((org: any) => (
                    <tr
                      key={org.org_id}
                      className={`border-b hover:bg-muted/50 cursor-pointer transition-all duration-150 ${
                        expandedOrg === org.org_id ? 'bg-muted' : ''
                      }`}
                      onClick={() => handleOrgClick(org.org_id)}
                    >
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-4 w-4 transition-transform duration-150 ${
                            expandedOrg === org.org_id ? 'rotate-90' : ''
                          }`} />
                          {org.org_id}
                        </div>
                      </td>
                      <td className="p-2">{org.name || org.org_name}</td>
                      <td className="p-2">
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{org.key_name || 'Via Langfuse'}</code>
                          {org.key_name && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                copyToClipboard(org.key_name, org.org_id)
                              }}
                            >
                              {copiedKey === org.org_id ? (
                                <Check className="h-3 w-3" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                        </div>
                      </td>
                      <td className="p-2 text-right font-mono">
                        {org.requests?.toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-mono">
                        ${org.cost?.toFixed(2)}
                      </td>
                      <td className="p-2 text-right font-mono">
                        {org.tokens?.toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setShowTraceModal(true)
                          }}
                        >
                          View Traces
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Expanded Details */}
            {expandedOrg && selectedOrgData && (
              <div className="mt-4 p-4 bg-muted/50 rounded-lg space-y-3 animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Organization Details</h4>
                  <Badge variant="outline">
                    <Zap className="h-3 w-3 mr-1" />
                    Instant Load
                  </Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Organization</p>
                    <p className="font-medium">{selectedOrgData.org_name || selectedOrgData.name}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">API Key</p>
                    <p className="font-mono text-xs">{selectedOrgData.key_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Total Requests</p>
                    <p className="font-medium">{selectedOrgData.requests?.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Trace Types</p>
                    <p className="font-medium">
                      {selectedOrgData.traceTypes ? Object.keys(selectedOrgData.traceTypes).length : 0} types
                    </p>
                  </div>
                </div>
                {selectedOrgData.traceTypes && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-2">Trace Breakdown:</p>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(selectedOrgData.traceTypes).map(([type, count]: [string, any]) => (
                        <Badge key={type} variant="secondary">
                          {type}: {count}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Performance Indicator */}
        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  Performance Mode: Active
                </p>
                <p className="text-xs text-muted-foreground">
                  Client-side filtering • Instant navigation • Zero API calls on filter
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600">0ms</p>
                <p className="text-xs text-muted-foreground">Filter latency</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Trace Modal */}
      <Dialog open={showTraceModal} onOpenChange={setShowTraceModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Trace Details</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <p className="text-sm text-muted-foreground">
              Trace details would load here instantly from cached data.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
