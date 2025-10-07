import { NextRequest, NextResponse } from 'next/server'

const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID
const POSTHOG_HOST = process.env.POSTHOG_HOST || 'https://app.posthog.com'

// GET - Fetch all feature flags or a specific one
export async function GET(request: NextRequest) {
  try {
    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return NextResponse.json(
        { error: 'PostHog API credentials not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const flagKey = searchParams.get('key') // Optional: get specific flag by key

    // Fetch all feature flags
    const response = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/feature_flags/`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PostHog API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch feature flags', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()

    // If requesting a specific flag by key, find it
    if (flagKey) {
      const flag = data.results?.find((f: any) => f.key === flagKey)
      if (!flag) {
        return NextResponse.json(
          { error: `Feature flag '${flagKey}' not found` },
          { status: 404 }
        )
      }
      return NextResponse.json(flag)
    }

    // Return all flags
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching feature flags:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// PATCH - Update a feature flag (add/remove emails from Set 2)
export async function PATCH(request: NextRequest) {
  try {
    if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
      return NextResponse.json(
        { error: 'PostHog API credentials not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { flagId, filters } = body

    if (!flagId) {
      return NextResponse.json(
        { error: 'flagId is required' },
        { status: 400 }
      )
    }

    // Update the feature flag
    const response = await fetch(
      `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/feature_flags/${flagId}/`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${POSTHOG_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filters }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('PostHog API error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to update feature flag', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating feature flag:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

