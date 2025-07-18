'use client'

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { format } from 'date-fns'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface UsageAreaChartProps {
  data: Array<{
    date: string
    requests: number
    cost: number
    tokens: number
  }>
  langfuseData?: Array<{
    date: string
    traces?: number
    cost: number
    tokens: number
  }>
  title?: string
  showCombined?: boolean
}

interface CombinedChartData {
  date: string
  requests: number
  dbCost: number
  traces: number
  langfuseCost: number
  tokens: number
  cost: number
}

const chartConfig = {
  requests: {
    label: "Database Requests",
    color: "var(--chart-1)",
  },
  traces: {
    label: "Langfuse Traces", 
    color: "var(--chart-2)",
  },
  cost: {
    label: "Total Cost ($)",
    color: "var(--chart-3)",
  },
  tokens: {
    label: "Tokens",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig

export function UsageAreaChart({ data, langfuseData, title, showCombined = false }: UsageAreaChartProps) {
  const [timeRange, setTimeRange] = React.useState("90d")

  // Show placeholder if no data
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="text-2xl text-muted-foreground mb-2">📊</div>
            <p className="text-muted-foreground">No usage data available</p>
            <p className="text-sm text-muted-foreground">Data will appear here once API calls are made</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If showing combined data, merge the datasets
  let chartData: any[] = data as any[]
  
  if (showCombined && langfuseData) {
    // Create a map of dates for easy lookup
    const langfuseMap = new Map(langfuseData.map(item => [item.date, item]))
    
    // Merge data by date
    chartData = data.map(dbItem => {
      const langfuseItem = langfuseMap.get(dbItem.date)
      return {
        date: dbItem.date,
        // Database metrics
        requests: dbItem.requests,
        dbCost: dbItem.cost,
        // Langfuse metrics
        traces: langfuseItem?.traces || 0,
        langfuseCost: langfuseItem?.cost || 0,
        tokens: langfuseItem?.tokens || 0,
        // Combined metrics
        cost: dbItem.cost + (langfuseItem?.cost || 0)
      }
    })
    
    // Add any Langfuse dates that don't exist in database data
    langfuseData.forEach(langfuseItem => {
      if (!data.find(dbItem => dbItem.date === langfuseItem.date)) {
        chartData.push({
          date: langfuseItem.date,
          requests: 0,
          dbCost: 0,
          traces: langfuseItem.traces || 0,
          langfuseCost: langfuseItem.cost || 0,
          tokens: langfuseItem.tokens || 0,
          cost: langfuseItem.cost || 0
        })
      }
    })
    
    // Sort by date
    chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  // Filter data based on time range
  const filteredData = React.useMemo(() => {
    if (!chartData.length) return []
    
    const referenceDate = new Date(chartData[chartData.length - 1].date)
    let daysToSubtract = 90
    
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    } else if (timeRange === "all") {
      return chartData
    }
    
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    
    return chartData.filter(item => {
      const itemDate = new Date(item.date)
      return itemDate >= startDate
    })
  }, [chartData, timeRange])

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1">
          <CardTitle>{title || "Usage Trends - Area Chart"}</CardTitle>
          <CardDescription>
            {showCombined 
              ? "Database requests, Langfuse traces, total cost, and tokens over time"
              : "API usage metrics over time"
            }
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="w-[160px] rounded-lg sm:ml-auto"
            aria-label="Select a time range"
          >
            <SelectValue placeholder="Last 3 months" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="90d" className="rounded-lg">
              Last 3 months
            </SelectItem>
            <SelectItem value="30d" className="rounded-lg">
              Last 30 days
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last 7 days
            </SelectItem>
            <SelectItem value="all" className="rounded-lg">
              All time
            </SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillRequests" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-requests)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-requests)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTraces" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-traces)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-traces)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillCost" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-cost)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillTokens" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-tokens)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-tokens)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <YAxis yAxisId="left" tickLine={false} axisLine={false} />
            <YAxis yAxisId="right" orientation="right" tickLine={false} axisLine={false} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  }}
                  formatter={(value: any, name: any) => {
                    if (String(name).toLowerCase().includes('cost')) {
                      return [`$${Number(value).toFixed(2)}`, String(name)]
                    }
                    return [Number(value).toLocaleString(), String(name)]
                  }}
                  indicator="dot"
                />
              }
            />
            {showCombined ? (
              <>
                {/* Database Requests */}
                <Area
                  yAxisId="left"
                  dataKey="requests"
                  type="natural"
                  fill="url(#fillRequests)"
                  stroke="var(--color-requests)"
                  stackId="a"
                />
                {/* Langfuse Traces */}
                <Area
                  yAxisId="left"
                  dataKey="traces"
                  type="natural"
                  fill="url(#fillTraces)"
                  stroke="var(--color-traces)"
                  stackId="b"
                />
                {/* Total Cost */}
                <Area
                  yAxisId="right"
                  dataKey="cost"
                  type="natural"
                  fill="url(#fillCost)"
                  stroke="var(--color-cost)"
                  stackId="c"
                />
                {/* Tokens */}
                <Area
                  yAxisId="right"
                  dataKey="tokens"
                  type="natural"
                  fill="url(#fillTokens)"
                  stroke="var(--color-tokens)"
                  stackId="d"
                />
              </>
            ) : (
              <>
                {/* Original single-source chart */}
                <Area
                  yAxisId="left"
                  dataKey="requests"
                  type="natural"
                  fill="url(#fillRequests)"
                  stroke="var(--color-requests)"
                  stackId="a"
                />
                <Area
                  yAxisId="right"
                  dataKey="cost"
                  type="natural"
                  fill="url(#fillCost)"
                  stroke="var(--color-cost)"
                  stackId="b"
                />
              </>
            )}
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 