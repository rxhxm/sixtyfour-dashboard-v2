export interface ApiUsage {
  id: string
  api_key: string
  endpoint: string
  timestamp: string
  metadata: {
    org_id?: string
    method?: string
    status_code?: number
    request_count?: number
    response_time_ms?: number
    cost_usd?: number
    tokens_used?: number
    model_used?: string
    trace_id?: string
    user_id?: string
    organization?: string
    [key: string]: any
  }
}

export interface Organization {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
}

export interface ApiKey {
  id: string
  key_hash: string
  org_id: string
  name: string
  is_active: boolean
  created_at: string
  last_used_at?: string
}

export interface UsageMetrics {
  totalRequests: number
  totalCost: number
  totalTokens: number
  averageResponseTime: number
  successRate: number
  organizationBreakdown: {
    org_id: string
    org_name: string
    requests: number
    cost: number
    tokens: number
  }[]
}

export interface FilterState {
  orgId?: string
  timeRange?: string
  startDate?: string
  endDate?: string
  endpoint?: string
  method?: string
  status?: string
} 