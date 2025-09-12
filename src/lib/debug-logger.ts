// Debug logger for performance tracking
import { NextRequest } from 'next/server'

interface LogEntry {
  timestamp: string
  type: 'API_START' | 'API_END' | 'CLIENT_START' | 'CLIENT_END' | 'FETCH_START' | 'FETCH_END' | 'ERROR'
  route?: string
  duration?: number
  details?: any
  memory?: {
    used: number
    total: number
  }
}

class PerformanceLogger {
  private logs: LogEntry[] = []
  private timers: Map<string, number> = new Map()
  
  startTimer(id: string) {
    this.timers.set(id, Date.now())
  }
  
  endTimer(id: string): number {
    const start = this.timers.get(id)
    if (!start) return 0
    const duration = Date.now() - start
    this.timers.delete(id)
    return duration
  }
  
  log(entry: Omit<LogEntry, 'timestamp'>) {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
    }
    
    // Add memory info if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const mem = process.memoryUsage()
      logEntry.memory = {
        used: Math.round(mem.heapUsed / 1024 / 1024), // MB
        total: Math.round(mem.heapTotal / 1024 / 1024), // MB
      }
    }
    
    this.logs.push(logEntry)
    
    // Console output with color coding
    const color = entry.type === 'ERROR' ? '\x1b[31m' : 
                  entry.type.includes('START') ? '\x1b[33m' : 
                  '\x1b[32m'
    const reset = '\x1b[0m'
    
    console.log(
      `${color}[${logEntry.timestamp}] ${entry.type}${reset}`,
      entry.route ? `Route: ${entry.route}` : '',
      entry.duration ? `Duration: ${entry.duration}ms` : '',
      entry.details ? JSON.stringify(entry.details, null, 2) : '',
      logEntry.memory ? `Memory: ${logEntry.memory.used}MB/${logEntry.memory.total}MB` : ''
    )
  }
  
  getLogs() {
    return this.logs
  }
  
  clearLogs() {
    this.logs = []
    this.timers.clear()
  }
  
  getSummary() {
    const apiCalls = this.logs.filter(l => l.type === 'API_END')
    const totalApiTime = apiCalls.reduce((sum, call) => sum + (call.duration || 0), 0)
    const slowestApi = apiCalls.sort((a, b) => (b.duration || 0) - (a.duration || 0))[0]
    
    return {
      totalLogs: this.logs.length,
      totalApiCalls: apiCalls.length,
      totalApiTime,
      averageApiTime: apiCalls.length ? Math.round(totalApiTime / apiCalls.length) : 0,
      slowestApi: slowestApi ? {
        route: slowestApi.route,
        duration: slowestApi.duration
      } : null,
      errors: this.logs.filter(l => l.type === 'ERROR').length
    }
  }
}

export const logger = new PerformanceLogger()

// Middleware for API routes
export function withLogging(handler: Function, routeName: string) {
  return async (req: NextRequest, ...args: any[]) => {
    const timerId = `api-${routeName}-${Date.now()}`
    
    logger.startTimer(timerId)
    logger.log({
      type: 'API_START',
      route: routeName,
      details: {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries())
      }
    })
    
    try {
      const result = await handler(req, ...args)
      
      const duration = logger.endTimer(timerId)
      logger.log({
        type: 'API_END',
        route: routeName,
        duration,
        details: {
          status: result.status || 200,
          hasData: !!result
        }
      })
      
      return result
    } catch (error) {
      const duration = logger.endTimer(timerId)
      logger.log({
        type: 'ERROR',
        route: routeName,
        duration,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        }
      })
      throw error
    }
  }
}
