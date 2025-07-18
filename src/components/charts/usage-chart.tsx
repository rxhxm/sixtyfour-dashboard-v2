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

export function UsageChart({ data, langfuseData, title, showCombined = false }: UsageChartProps) {
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

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(value) => format(new Date(value), 'MMM dd')}
          />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip 
            labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
            formatter={(value: number, name: string) => {
              if (name.toLowerCase().includes('cost')) {
                return [`$${value.toFixed(2)}`, name]
              }
              return [value.toLocaleString(), name]
            }}
          />
          <Legend />
          
          {showCombined ? (
            <>
              {/* Database Requests */}
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="requests" 
                stroke="#3b82f6" 
                strokeWidth={2}
                name="Database Requests"
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
              />
              
              {/* Langfuse Traces */}
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="traces" 
                stroke="#8b5cf6" 
                strokeWidth={2}
                name="Langfuse Traces"
                dot={{ fill: '#8b5cf6', strokeWidth: 2, r: 3 }}
              />
              
              {/* Combined Cost */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="cost" 
                stroke="#10b981" 
                strokeWidth={3}
                name="Total Cost ($)"
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              />
              
              {/* Tokens */}
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="tokens" 
                stroke="#f59e0b" 
                strokeWidth={2}
                name="Tokens"
                dot={{ fill: '#f59e0b', strokeWidth: 2, r: 3 }}
                strokeDasharray="5 5"
              />
            </>
          ) : (
            <>
              {/* Original single-source chart */}
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
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
} 