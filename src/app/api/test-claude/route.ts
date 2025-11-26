import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60 // Allow time for multiple generations

// ⚠️ HARDCODED KEY - NOT GOOD PRACTICE but requested for testing
const CLAUDE_API_KEY = 'sk-ant-api03-REPLACE_THIS_WITH_YOUR_REAL_KEY'

export async function POST(request: NextRequest) {
  try {
    const { prompt, n = 1 } = await request.json()
    
    // Validate input
    const numResponses = Math.min(Math.max(1, parseInt(n)), 10) // Clamp between 1 and 10
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    console.log(`🤖 Testing Claude: Generating ${numResponses} responses...`)

    // Create array of promises for parallel execution
    const promises = Array(numResponses).fill(null).map(async (_, index) => {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': CLAUDE_API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20240620',
            max_tokens: 1024,
            messages: [{ role: 'user', content: prompt }]
          })
        })

        if (!response.ok) {
          const errorText = await response.text()
          return { 
            index: index + 1, 
            error: `API Error: ${response.status} - ${errorText}` 
          }
        }

        const data = await response.json()
        return {
          index: index + 1,
          content: data.content[0]?.text || 'No content'
        }
      } catch (err: any) {
        return { 
          index: index + 1, 
          error: err.message 
        }
      }
    })

    // Wait for all to finish
    const results = await Promise.all(promises)
    
    return NextResponse.json({ 
      success: true, 
      results 
    })

  } catch (error: any) {
    console.error('Model test error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
