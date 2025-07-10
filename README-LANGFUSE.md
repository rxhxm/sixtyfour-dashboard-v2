# Langfuse Integration

This dashboard now supports fetching real cost and usage data from Langfuse in addition to the existing database.

## Setup

### 1. Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# Langfuse Configuration
LANGFUSE_PUBLIC_KEY=pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843
LANGFUSE_SECRET_KEY=sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65
LANGFUSE_HOST=https://us.cloud.langfuse.com
```

### 2. Using the Dashboard

1. **Data Source Toggle**: Use the toggle in the top-right corner to switch between:
   - **Database**: Shows data from your Supabase database (original functionality)
   - **Langfuse**: Shows real cost and usage data from your Langfuse project

2. **Langfuse View Features**:
   - **Total Traces**: Shows the number of traces instead of requests
   - **Total Cost**: Real cost data from Langfuse (e.g., $3,280.11)
   - **Total Tokens**: Token usage across all models
   - **Trace Types**: Different types of traces (e.g., "enrich_lead", "find_email", "qa_agent")

3. **Time Period Controls**: Work with both data sources
   - Filter by days, weeks, or months
   - Navigate through different time periods
   - Langfuse data respects the selected time range

4. **Organization/Trace Type Filtering**: Click on any item in the list to filter data

## API Endpoints

### `/api/langfuse-metrics`

Fetches real metrics from Langfuse including:
- Daily cost and usage data
- Trace information
- Model usage breakdown
- Organization/trace type breakdowns

**Parameters**:
- `startDate`: ISO timestamp for start of range
- `endDate`: ISO timestamp for end of range  
- `days`: Number of days to fetch (alternative to date range)
- `selectedOrg`: Filter by specific trace name/organization

**Response**:
```json
{
  "summary": {
    "totalCost": 3280.11,
    "totalTraces": 91120,
    "totalTokens": 2500000,
    "avgCostPerTrace": 0.036
  },
  "organizations": [
    {
      "name": "enrich_lead",
      "requests": 65178,
      "cost": 2100.50,
      "tokens": 1800000
    }
  ],
  "chartData": [
    {
      "date": "2025-01-10",
      "cost": 150.25,
      "traces": 5000,
      "tokens": 120000
    }
  ]
}
```

## Current State

Based on your Langfuse dashboard screenshots, you have:
- **91.12K traces** tracked
- **$3,280.11** in total costs
- Multiple models: gpt-4.1-mini, o4-mini, gpt-4.1-nano, etc.
- Trace types: enrich_lead (65,178), find_email (20,072), qa_agent (4,139), etc.

This integration will now show your real Langfuse cost data instead of the previous $0.00 placeholder values.

## Next Steps

1. Add the environment variables to your `.env.local` file
2. Restart your development server
3. Toggle to "Langfuse" view to see your real cost data
4. Use the time period controls to analyze usage over different periods
5. Click on trace types to filter and drill down into specific usage patterns 