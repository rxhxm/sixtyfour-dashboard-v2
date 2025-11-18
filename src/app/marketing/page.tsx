'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, Bar, BarChart } from 'recharts'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Users, TrendingUp, Activity, DollarSign, Calendar, UserPlus, Zap } from 'lucide-react'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

type TimePeriod = '7days' | '30days' | '90days' | 'all'

interface MarketingMetrics {
  summary: {
    totalUsers: number
    newUsersInPeriod: number
    activeUsers: number
    avgSignupsPerDay: number
    totalCost: number
    totalTokens: number
    totalRequests: number
    avgCostPerUser: number
    avgRequestsPerUser: number
  }
  dailySignups: Array<{ date: string; signups: number }>
  dailyUsage: Array<{ date: string; cost: number; tokens: number; requests: number }>
  topUsers: Array<{
    userId: string
    email: string
    createdAt: string
    cost: number
    tokens: number
    requests: number
  }>
}

function getTimeRange(period: TimePeriod) {
  const now = new Date()
  let startDate: Date
  
  switch (period) {
    case '7days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case 'all':
    default:
      startDate = new Date('2020-01-01')
      break
  }
  
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    label: period === 'all' ? 'All Time' : period === '7days' ? 'Last 7 Days' : period === '30days' ? 'Last 30 Days' : 'Last 90 Days'
  }
}

const signupChartConfig = {
  signups: {
    label: "New Signups",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig

const usageChartConfig = {
  cost: {
    label: "Cost ($)",
    color: "hsl(var(--chart-2))",
  },
  requests: {
    label: "Requests",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

export default function MarketingPage() {
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])
  
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  const [loading, setLoading] = useState(true)
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('30days')
  const [metrics, setMetrics] = useState<MarketingMetrics | null>(null)
  
  // Auth check
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        console.log('🚫 No Supabase session - redirecting')
        router.push('/auth/signin')
        return
      }
      
      if (!isAuthorizedEmail(session.user.email)) {
        console.log('🚨 UNAUTHORIZED EMAIL:', session.user.email)
        alert('UNAUTHORIZED ACCESS - You do not have permission to access this dashboard.')
        await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      
      console.log('✅ Authorized access:', session.user.email)
      setAuthVerified(true)
      setAuthChecking(false)
    }
    
    checkAuth()
  }, [router, supabase])
  
  // Fetch marketing metrics
  useEffect(() => {
    if (!authVerified) return
    
    const fetchMetrics = async () => {
      setLoading(true)
      
      try {
        const timeRange = getTimeRange(timePeriod)
        const params = new URLSearchParams({
          startDate: timeRange.startDate,
          endDate: timeRange.endDate
        })
        
        const response = await fetch(`/api/marketing-metrics?${params}`)
        
        if (response.ok) {
          const data = await response.json()
          setMetrics(data)
          console.log('✅ Marketing metrics loaded:', data.summary)
        } else {
          console.error('Failed to fetch marketing metrics:', response.status)
        }
      } catch (error) {
        console.error('Error fetching marketing metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetrics()
  }, [timePeriod, authVerified])
  
  // Format date for chart
  const formatDate = (dateStr: string, period: TimePeriod) => {
    const date = new Date(dateStr)
    if (period === '7days') {
      return format(date, 'MMM dd')
    } else if (period === '30days' || period === '90days') {
      return format(date, 'MMM dd')
    }
    return format(date, 'MMM yyyy')
  }
  
  // Auth checking spinner
  if (authChecking || !authVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
          </div>
          <p className="text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    )
  }
  
  // Loading spinner
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
            </div>
            <p className="text-sm font-medium">Loading marketing analytics...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (!metrics) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load marketing metrics</p>
        </div>
      </DashboardLayout>
    )
  }
  
  // Calculate growth rate
  const growthRate = metrics.dailySignups.length >= 2
    ? ((metrics.dailySignups[metrics.dailySignups.length - 1]?.signups || 0) - 
       (metrics.dailySignups[0]?.signups || 0))
    : 0
  
  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Marketing Analytics</h1>
            <p className="text-muted-foreground mt-1">Track user signups and platform engagement</p>
          </div>
          
          {/* Time Period Selector */}
          <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Users */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.totalUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">All time signups</p>
            </CardContent>
          </Card>

          {/* New Users in Period */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Signups</CardTitle>
              <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                <UserPlus className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.newUsersInPeriod.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Avg {metrics.summary.avgSignupsPerDay.toFixed(1)}/day
              </p>
              {growthRate !== 0 && (
                <Badge variant={growthRate > 0 ? "default" : "secondary"} className="mt-2">
                  {growthRate > 0 ? '+' : ''}{growthRate} trend
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Active Users */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center">
                <Zap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.activeUsers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((metrics.summary.activeUsers / metrics.summary.totalUsers) * 100).toFixed(1)}% of total
              </p>
            </CardContent>
          </Card>

          {/* Total Revenue/Cost */}
          <Card className="hover:shadow-lg transition-shadow duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage Cost</CardTitle>
              <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${metrics.summary.totalCost.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                ${metrics.summary.avgCostPerUser.toFixed(2)}/user avg
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total API Requests</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.totalRequests.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.summary.avgRequestsPerUser.toFixed(0)} avg/user
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.summary.totalTokens.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all users</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Period</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">{getTimeRange(timePeriod).label}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.dailySignups.length} days of data
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Signup Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Signups</CardTitle>
            <CardDescription>Number of new users signing up each day</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.dailySignups.length > 0 ? (
              <ChartContainer config={signupChartConfig} className="h-[300px] w-full">
                <AreaChart
                  data={metrics.dailySignups}
                  margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => formatDate(value, timePeriod)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent
                      labelFormatter={(value) => formatDate(value as string, timePeriod)}
                    />}
                  />
                  <defs>
                    <linearGradient id="fillSignups" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-signups)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-signups)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <Area
                    dataKey="signups"
                    type="monotone"
                    fill="url(#fillSignups)"
                    fillOpacity={0.4}
                    stroke="var(--color-signups)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No signup data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Usage Cost Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Daily API Usage</CardTitle>
            <CardDescription>API requests and costs per day</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.dailyUsage.length > 0 ? (
              <ChartContainer config={usageChartConfig} className="h-[300px] w-full">
                <BarChart
                  data={metrics.dailyUsage}
                  margin={{ left: 12, right: 12, top: 12, bottom: 12 }}
                >
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => formatDate(value, timePeriod)}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    yAxisId="left"
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    yAxisId="right"
                    orientation="right"
                  />
                  <ChartTooltip
                    content={<ChartTooltipContent
                      labelFormatter={(value) => formatDate(value as string, timePeriod)}
                      formatter={(value: any, name: any) => {
                        if (name === 'cost') {
                          return [`$${Number(value).toFixed(3)}`, 'Cost']
                        }
                        return [Number(value).toLocaleString(), name]
                      }}
                    />}
                  />
                  <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} yAxisId="left" />
                  <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} yAxisId="right" />
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                No usage data available for this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Top Users by Usage</CardTitle>
            <CardDescription>Users with the highest API usage and costs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Rank</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Joined</th>
                    <th className="text-right py-3 px-4 font-medium">Requests</th>
                    <th className="text-right py-3 px-4 font-medium">Tokens</th>
                    <th className="text-right py-3 px-4 font-medium">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topUsers.length > 0 ? (
                    metrics.topUsers.map((user, index) => (
                      <tr key={user.userId} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">
                          <Badge variant={index < 3 ? "default" : "secondary"}>
                            #{index + 1}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 font-medium">{user.email}</td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {format(new Date(user.createdAt), 'MMM dd, yyyy')}
                        </td>
                        <td className="py-3 px-4 text-right">{user.requests.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{user.tokens.toLocaleString()}</td>
                        <td className="py-3 px-4 text-right font-medium">
                          ${user.cost.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-muted-foreground">
                        No user data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


