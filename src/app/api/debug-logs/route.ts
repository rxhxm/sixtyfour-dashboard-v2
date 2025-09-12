import { NextResponse } from 'next/server'
import { logger } from '@/lib/debug-logger'

export async function GET() {
  const logs = logger.getLogs()
  const summary = logger.getSummary()
  
  return NextResponse.json({
    summary,
    logs,
    timestamp: new Date().toISOString()
  })
}

export async function DELETE() {
  logger.clearLogs()
  return NextResponse.json({ message: 'Logs cleared' })
}
