# Dashboard Setup Guide

## Environment Variables Needed

Create a `.env.local` file in the root directory with the following variables:

```bash
# Langfuse API credentials (these are the ones from our conversation)
LANGFUSE_PUBLIC_KEY=pk-lf-f0f9f1ed-0be8-41de-932c-a1ef1f1bd843
LANGFUSE_SECRET_KEY=sk-lf-876c3729-97bc-4a38-82cf-2f39c7f04e65
LANGFUSE_HOST=https://us.cloud.langfuse.com

# Supabase credentials (replace with your actual values)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_KEY=your-supabase-service-key

# Database credentials (if needed for other APIs)
DATABASE_URL=your-database-url
```

## What Was Restored

✅ **Main Dashboard Page** (`src/app/page.tsx`)
- Complete dashboard with both Database and Langfuse metrics
- Time period controls (Days, Weeks, Months, Custom Range, All Time)
- Organization filtering
- Real-time charts and metrics

✅ **Langfuse Utilities** (`src/lib/langfuse.ts`)
- API client functions for Langfuse integration
- Daily metrics fetching
- Trace data retrieval
- Organization mapping

✅ **Fixed Langfuse API Route** (`src/app/api/langfuse-metrics/route.ts`)
- **CRITICAL FIX**: Proper handling of "All Time" selection (undefined dates)
- **CRITICAL FIX**: Conditional daily metrics (only call when dates are provided)
- **CRITICAL FIX**: Reduced trace limit to 100 (Langfuse API maximum)
- **CRITICAL FIX**: Proper error handling and logging

## The Main Fix Applied

The core issue was in the `langfuse-metrics` API route. The original code was:

```typescript
// OLD - BROKEN FOR "ALL TIME"
if (startDate && endDate) {
  // Use provided dates
} else {
  // Always fell back to days-based range
}
```

**Fixed to:**

```typescript
// NEW - WORKS FOR "ALL TIME"
if (startDate !== null && endDate !== null && startDate !== undefined && endDate !== undefined) {
  // Use provided dates
} else {
  // For "All Time" - don't set date filters
  fromTimestamp = undefined
  toTimestamp = undefined
}

// Only fetch daily metrics when dates are provided
if (fromTimestamp && toTimestamp) {
  // Fetch both traces and daily metrics
} else {
  // For "All Time" - only fetch traces (daily metrics requires dates)
  traces = await fetchLangfuseTraces(tracesOptions)
}
```

## Current Status

- ✅ Dashboard is running at http://localhost:3000
- ✅ Main page loads correctly  
- ❌ Langfuse API needs environment variables to work

## Next Steps

1. **Create `.env.local`** with the environment variables above
2. **Update Supabase credentials** with your actual values
3. **Restart the development server**: `npm run dev`
4. **Test "All Time" selection** - it should now show 100 traces (API limit)

## Test Commands

Once environment is set up:

```bash
# Test "All Time" - no date filters
curl "http://localhost:3000/api/langfuse-metrics"

# Test with dates
curl "http://localhost:3000/api/langfuse-metrics?startDate=2024-01-01&endDate=2024-12-31"
```

The dashboard should now work correctly for all time periods including "All Time" which was the main issue we fixed! 