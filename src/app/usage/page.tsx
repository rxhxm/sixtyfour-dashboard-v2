'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { UsageChart } from '@/components/charts/usage-chart'
import { ApiUsage, Organization } from '@/types/database'
import { formatDistanceToNow } from 'date-fns'

export default function UsagePage() {
  const [usageData, setUsageData] = useState<ApiUsage[]>([])
  const [chartData, setChartData] = useState<any[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('7')

  useEffect(() => {
    fetchData()
  }, [selectedOrg, timeRange])

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days: timeRange,
        ...(selectedOrg && { orgId: selectedOrg })
      })

      const [usageResponse, chartResponse, orgsResponse] = await Promise.all([
        fetch(`/api/usage?${params}`),
        fetch(`/api/charts-optimized?${params}`),
        fetch('/api/organizations')
      ])

      if (usageResponse.ok) {
        const usage = await usageResponse.json()
        setUsageData(usage.slice(0, 100)) // Limit to 100 records for display
      }

      if (chartResponse.ok) {
        const charts = await chartResponse.json()
        setChartData(charts)
      }

      if (orgsResponse.ok) {
        const orgs = await orgsResponse.json()
        setOrganizations(orgs)
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (statusCode: number) => {
    if (statusCode >= 200 && statusCode < 300) {
      return <Badge variant="default" className="bg-green-100 text-green-800">Success</Badge>
    } else if (statusCode >= 400 && statusCode < 500) {
      return <Badge variant="destructive" className="bg-yellow-100 text-yellow-800">Client Error</Badge>
    } else {
      return <Badge variant="destructive">Server Error</Badge>
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading usage data...</p>
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
            <h1 className="text-3xl font-bold">API Usage Analytics</h1>
            <p className="text-muted-foreground">
              Detailed API usage metrics and request logs
            </p>
          </div>
          <div className="flex gap-4">
            <Select value={selectedOrg} onValueChange={setSelectedOrg}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Organizations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Organizations</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24h</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Usage Trends Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Usage Trends</CardTitle>
            <CardDescription>
              API requests and costs over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsageChart data={chartData} />
          </CardContent>
        </Card>

        {/* Usage Table */}
        <Card>
          <CardHeader>
            <CardTitle>Recent API Requests</CardTitle>
            <CardDescription>
              Latest {usageData.length} API requests with details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Organization</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Tokens</TableHead>
                  <TableHead>Response Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usageData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-sm">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.endpoint}
                    </TableCell>
                    <TableCell>
                      {item.metadata?.organization || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.metadata?.status_code || 200)}
                    </TableCell>
                    <TableCell className="text-right">
                      ${(item.metadata?.cost_usd || 0).toFixed(4)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(item.metadata?.tokens_used || 0).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.metadata?.response_time_ms || 0}ms
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 