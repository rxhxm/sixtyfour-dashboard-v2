'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'

interface UsageChartProps {
  data: Array<{
    date: string
    requests: number
    cost: number
    tokens: number
  }>
}

export function UsageChart({ data }: UsageChartProps) {
  // Show placeholder if no data
  if (!data || data.length === 0) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl text-muted-foreground mb-2">📊</div>
          <p className="text-muted-foreground">No usage data available</p>
          <p className="text-sm text-muted-foreground">Data will appear here once API calls are made</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip 
            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
            formatter={(value: number, name: string) => [
              name === 'cost' ? `$${value.toFixed(2)}` : value.toLocaleString(),
              name.charAt(0).toUpperCase() + name.slice(1)
            ]}
          />
          <Legend />
          <Line 
            yAxisId="left"
            type="monotone" 
            dataKey="requests" 
            stroke="#8884d8" 
            strokeWidth={2}
            name="Requests"
          />
          <Line 
            yAxisId="right"
            type="monotone" 
            dataKey="cost" 
            stroke="#82ca9d" 
            strokeWidth={2}
            name="Cost ($)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 