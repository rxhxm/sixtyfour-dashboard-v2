"use client"

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface LangfuseChartData {
  date: string
  traces: number
  cost: number
  tokens: number
}

interface LangfuseAreaChartProps {
  data: LangfuseChartData[]
  title?: string
  description?: string
  timePeriod?: string
}

const chartConfig = {
  traces: {
    label: "Traces",
    color: "hsl(var(--chart-1))",
  },
  cost: {
    label: "Cost ($)",
    color: "hsl(var(--chart-2))",
  },
  tokens: {
    label: "Tokens",
    color: "hsl(var(--chart-3))",
  },
} satisfies ChartConfig

const formatDate = (dateStr: string, timePeriod?: string) => {
  const date = new Date(dateStr)
  
  // Determine format based on time period
  if (timePeriod === '5min' || timePeriod === '30min' || timePeriod === '1hour') {
    // For very short periods, show HH:mm
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } else if (timePeriod === '24hours') {
    // For 24 hours, show hour
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
  } else if (timePeriod === '7days') {
    // For 7 days, show day and month
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else if (timePeriod === '1month' || timePeriod === '3months') {
    // For months, show date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } else if (timePeriod === '1year') {
    // For year, show month
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
  }
  
  // Default format
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatCost = (value: number) => {
  return `$${value.toFixed(3)}`
}

const formatTokens = (value: number) => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toString()
}

export function LangfuseAreaChart({ 
  data, 
  title = "Langfuse Metrics Over Time", 
  description = "Traces, cost, and tokens from Langfuse",
  timePeriod
}: LangfuseAreaChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No data available for the selected period
          </div>
        </CardContent>
      </Card>
    )
  }

  // Calculate dynamic Y-axis domain based on actual data
  const allTraces = data.map(d => d.traces)
  const maxTraces = Math.max(...allTraces)
  const minTraces = Math.min(...allTraces)
  
  // Debug: Check if we have any huge values
  console.log('Chart data check:', {
    sampleData: data[0],
    maxTraces,
    allValues: data.map(d => ({ traces: d.traces, tokens: d.tokens })).slice(0, 3)
  })
  
  // Smart scaling based on data range - optimized for trace counts
  let yAxisMin = 0 // Always start from 0 for trace counts
  let yAxisMax
  
  if (maxTraces <= 100) {
    // For small trace counts, add 20% padding
    yAxisMax = Math.ceil(maxTraces * 1.2)
  } else if (maxTraces <= 1000) {
    // For medium trace counts, add 10% padding
    yAxisMax = Math.ceil(maxTraces * 1.1)
  } else {
    // For large trace counts, add 5% padding
    yAxisMax = Math.ceil(maxTraces * 1.05)
  }

  // Special handling for single data points
  if (data.length === 1 && maxTraces === minTraces) {
    yAxisMin = 0
    yAxisMax = maxTraces * 1.5 // Give more room for single points
  }

  // Smart tick formatting based on data range
  const formatTick = (value: number) => {
    if (maxTraces <= 1000) {
      return value.toString()
    } else if (maxTraces <= 10000) {
      return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : value.toString()
    } else {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`
      }
      return value.toString()
    }
  }

  console.log('Chart scaling:', {
    dataPoints: data.length,
    traceRange: { min: minTraces, max: maxTraces },
    yAxisRange: { min: yAxisMin, max: yAxisMax },
    scalingStrategy: maxTraces <= 100 ? 'small' : maxTraces <= 1000 ? 'medium' : 'large',
    sampleData: data.slice(0, 3)
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart
            accessibilityLayer
            data={data.map(d => ({ date: d.date, traces: d.traces }))} // Only pass traces data
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
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
              tickFormatter={formatTick}
              domain={[0, yAxisMax]}
              type="number"
              allowDataOverflow={false}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent 
                labelFormatter={(value: any) => formatDate(value as string, timePeriod)}
                formatter={(value: any, name: any) => {
                  if (name === 'cost') {
                    return [formatCost(Number(value)), 'Cost']
                  }
                  if (name === 'tokens') {
                    return [formatTokens(Number(value)), 'Tokens']
                  }
                  return [Number(value).toLocaleString(), name]
                }}
              />}
            />
            <defs>
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
            <Area
              dataKey="traces"
              type="monotone"
              fill="url(#fillTraces)"
              fillOpacity={0.4}
              stroke="var(--color-traces)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
} 