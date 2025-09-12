import { NextResponse } from 'next/server'

export async function GET() {
  const startTime = Date.now()
  
  // Test Langfuse API speed
  let langfuseTime = 0
  try {
    const testStart = Date.now()
    const response = await fetch('https://us.cloud.langfuse.com/api/public/traces?page=1&limit=1', {
      headers: {
        'X-Langfuse-Public-Key': process.env.NEXT_PUBLIC_LANGFUSE_PUBLIC_KEY || '',
        'X-Langfuse-Secret-Key': process.env.LANGFUSE_SECRET_KEY || ''
      }
    })
    langfuseTime = Date.now() - testStart
  } catch (e) {
    langfuseTime = -1
  }
  
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || 'unknown',
    langfuseApiSpeed: `${langfuseTime}ms`,
    serverResponseTime: `${Date.now() - startTime}ms`,
    parallelFetchingEnabled: true,
    batchSize: 10,
    message: 'Parallel fetching with batch size 10 is enabled'
  })
}
