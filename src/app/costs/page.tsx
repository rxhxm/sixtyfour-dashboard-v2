'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { TrendingUp, TrendingDown, DollarSign, Calculator } from 'lucide-react'
import { formatCost } from '@/lib/cost-calculator'

export default function CostsPage() {
  const [costData, setCostData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('30')

  useEffect(() => {
    fetchCostData()
  }, [selectedOrg, timeRange])

  const fetchCostData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        days: timeRange,
        ...(selectedOrg && { orgId: selectedOrg })
      })

      const response = await fetch(`/api/cost-analysis?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCostData(data)
      }
    } catch (error) {
      console.error('Failed to fetch cost data:', error)
    } finally {
      setLoading(false)
    }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading cost analysis...</p>
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
            <h1 className="text-3xl font-bold">Cost Analysis</h1>
            <p className="text-muted-foreground">
              API usage costs, trends, and Langfuse integration
            </p>
          </div>
          <div className="flex gap-4">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cost Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${costData?.summary?.totalCost?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Last {timeRange} days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Cost/Request</CardTitle>
              <Calculator className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${costData?.summary?.averageCostPerRequest?.toFixed(4) || '0.0000'}
              </div>
              <p className="text-xs text-muted-foreground">
                Per API request
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Forecast</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${costData?.summary?.monthlyForecast?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected monthly cost
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cost Trend</CardTitle>
              {(costData?.summary?.costTrend || 0) >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                (costData?.summary?.costTrend || 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {(costData?.summary?.costTrend || 0) >= 0 ? '+' : ''}
                ${costData?.summary?.costTrend?.toFixed(2) || '0.00'}
              </div>
              <p className="text-xs text-muted-foreground">
                Week over week
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Cost Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
              <CardDescription>
                API costs broken down by AI model
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={costData?.breakdown?.models || []}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ model, percentage }) => `${model} (${percentage?.toFixed(1)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="cost"
                  >
                    {(costData?.breakdown?.models || []).map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(4)}`, 'Cost']} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Daily Cost Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Cost Trend</CardTitle>
              <CardDescription>
                API costs over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={costData?.breakdown?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Cost']} />
                  <Bar dataKey="cost" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Top Endpoints by Cost */}
        <Card>
          <CardHeader>
            <CardTitle>Top Endpoints by Cost</CardTitle>
            <CardDescription>
              Highest cost API endpoints and their metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(costData?.breakdown?.endpoints || []).slice(0, 10).map((endpoint: any, index: number) => (
                <div key={endpoint.endpoint} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium font-mono text-sm">{endpoint.endpoint}</p>
                      <p className="text-sm text-muted-foreground">
                        {endpoint.requests.toLocaleString()} requests
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${endpoint.cost.toFixed(4)}</div>
                    <div className="text-sm text-muted-foreground">
                      ${endpoint.avgCostPerRequest.toFixed(6)}/req
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Organization Cost Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Cost by Organization</CardTitle>
            <CardDescription>
              API costs broken down by organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(costData?.breakdown?.organizations || []).map((org: any) => {
                const percentage = costData?.summary?.totalCost > 0 
                  ? (org.cost / costData.summary.totalCost) * 100 
                  : 0
                
                return (
                  <div key={org.orgId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{org.orgId}</span>
                      <span className="font-bold">${org.cost.toFixed(2)}</span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                    <div className="text-sm text-muted-foreground text-right">
                      {percentage.toFixed(1)}% of total cost
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Langfuse Integration Status */}
        <Card>
          <CardHeader>
            <CardTitle>Langfuse Integration</CardTitle>
            <CardDescription>
              LLM observability and cost tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Trace Collection</span>
                <Badge variant="default">Active</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Cost Calculation</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Token Tracking</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                Cost estimates are calculated using current model pricing and token usage patterns.
                Actual costs may vary based on your provider agreements.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
} 