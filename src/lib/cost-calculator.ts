// Model pricing per 1K tokens (example rates)
const MODEL_PRICING = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'claude-3-haiku': { input: 0.00025, output: 0.00125 }
}

export interface CostBreakdown {
  totalCost: number
  modelCosts: { [model: string]: number }
  organizationCosts: { [orgId: string]: number }
  dailyCosts: { [date: string]: number }
  averageCostPerRequest: number
  topCostDrivers: Array<{
    model: string
    cost: number
    requests: number
    percentage: number
  }>
}

export function calculateCostFromTokens(
  model: string,
  inputTokens: number = 0,
  outputTokens: number = 0
): number {
  const pricing = MODEL_PRICING[model as keyof typeof MODEL_PRICING]
  if (!pricing) {
    // Default pricing if model not found
    return ((inputTokens + outputTokens) / 1000) * 0.002
  }
  
  const inputCost = (inputTokens / 1000) * pricing.input
  const outputCost = (outputTokens / 1000) * pricing.output
  
  return inputCost + outputCost
}

export function enhanceCostData(apiUsageData: any[]): CostBreakdown {
  const modelCosts: { [model: string]: number } = {}
  const organizationCosts: { [orgId: string]: number } = {}
  const dailyCosts: { [date: string]: number } = {}
  let totalCost = 0
  
  apiUsageData.forEach(item => {
    // Extract cost from metadata, or calculate if tokens are available
    let itemCost = parseFloat(item.metadata?.cost_usd || '0')
    
    // If no cost but tokens available, calculate it
    if (itemCost === 0 && item.metadata?.tokens_used) {
      const model = item.metadata?.model_used || item.metadata?.model || 'gpt-3.5-turbo'
      const tokens = parseInt(item.metadata?.tokens_used || '0')
      // Assume 70% input, 30% output tokens if not specified
      const inputTokens = Math.floor(tokens * 0.7)
      const outputTokens = Math.floor(tokens * 0.3)
      itemCost = calculateCostFromTokens(model, inputTokens, outputTokens)
    }
    
    totalCost += itemCost
    
    // Model breakdown
    const model = item.metadata?.model_used || item.metadata?.model || 'unknown'
    modelCosts[model] = (modelCosts[model] || 0) + itemCost
    
    // Organization breakdown
    const orgId = item.metadata?.org_id || item.metadata?.organization || 'unknown'
    organizationCosts[orgId] = (organizationCosts[orgId] || 0) + itemCost
    
    // Daily breakdown
    const date = new Date(item.timestamp).toISOString().split('T')[0]
    dailyCosts[date] = (dailyCosts[date] || 0) + itemCost
  })
  
  // Calculate top cost drivers
  const topCostDrivers = Object.entries(modelCosts)
    .map(([model, cost]) => ({
      model,
      cost,
      requests: apiUsageData.filter(item => 
        (item.metadata?.model_used || item.metadata?.model || 'unknown') === model
      ).length,
      percentage: (cost / totalCost) * 100
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5)
  
  const averageCostPerRequest = apiUsageData.length > 0 ? totalCost / apiUsageData.length : 0
  
  return {
    totalCost,
    modelCosts,
    organizationCosts,
    dailyCosts,
    averageCostPerRequest,
    topCostDrivers
  }
}

export async function getLangfuseCostData(orgId?: string, days: number = 30): Promise<any> {
  try {
    // This would integrate with Langfuse API to get actual trace data
    // For now, return enhanced cost data from existing API usage
    return {
      traces: [],
      totalCost: 0,
      tokenUsage: 0,
      modelBreakdown: {}
    }
  } catch (error) {
    console.error('Error fetching Langfuse cost data:', error)
    return null
  }
}

export function formatCost(cost: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(cost)
} 