'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Clock, 
  DollarSign, 
  Hash, 
  Calendar, 
  Activity,
  Code,
  Copy,
  CheckCircle,
  ExternalLink,
  FileText,
  Zap,
  Database,
  ChevronDown,
  Loader2
} from 'lucide-react'

interface TraceDetails {
  id: string
  name: string
  timestamp: string
  duration?: number
  cost?: number
  tokens?: number
  model?: string
  status?: string
  input?: any
  output?: any
  metadata?: any
  error?: string
  userId?: string
  sessionId?: string
  tags?: string[]
}

interface TraceDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  traces: TraceDetails[]
  traceType: string
  orgName: string
}

export function TraceDetailsModal({
  isOpen,
  onClose,
  traces,
  traceType,
  orgName
}: TraceDetailsModalProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedTrace, setSelectedTrace] = useState<TraceDetails | null>(null)
  const [displayCount, setDisplayCount] = useState(50)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // Reset display count when modal opens or traces change
  useEffect(() => {
    if (isOpen) {
      setDisplayCount(50)
      setSelectedTrace(null)
    }
  }, [isOpen, traces])

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const formatJson = (data: any) => {
    if (!data) return 'No data'
    if (typeof data === 'string') return data
    try {
      return JSON.stringify(data, null, 2)
    } catch {
      return String(data)
    }
  }

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    setTimeout(() => {
      setDisplayCount(prev => Math.min(prev + 50, traces.length))
      setIsLoadingMore(false)
    }, 300) // Small delay for UX
  }

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString()
    } catch {
      return dateStr
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {traceType} Traces - {orgName}
          </DialogTitle>
        </DialogHeader>

        {/* Summary Statistics - Vertical Layout */}
        {traces.length > 0 && !selectedTrace && (
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm text-muted-foreground">Total Traces</span>
              <span className="text-lg font-bold">
                {traces.length}
                {traces.length > displayCount && (
                  <span className="text-xs text-muted-foreground ml-2">(showing {displayCount})</span>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm text-muted-foreground">Total Cost</span>
              <span className="text-lg font-bold">
                ${traces.reduce((sum, t) => sum + (t.cost || 0), 0).toFixed(4)}
              </span>
            </div>
            <div className="flex items-center justify-between pb-2 border-b">
              <span className="text-sm text-muted-foreground">Total Tokens</span>
              <span className="text-lg font-bold">
                {traces.reduce((sum, t) => sum + (t.tokens || 0), 0).toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Average Duration</span>
              <span className="text-lg font-bold">
                {(traces.reduce((sum, t) => sum + (t.duration || 0), 0) / traces.length).toFixed(0)}ms
              </span>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {selectedTrace ? (
            // Detailed view of a single trace
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTrace(null)}
                >
                  ← Back to list
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`https://cloud.langfuse.com/trace/${selectedTrace.id}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View in Langfuse
                </Button>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Trace Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Trace ID:</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {selectedTrace.id.substring(0, 12)}...
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2"
                          onClick={() => copyToClipboard(selectedTrace.id, 'trace-id')}
                        >
                          {copiedId === 'trace-id' ? (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Timestamp:</span>
                      </div>
                      <span className="text-sm font-medium">{formatDate(selectedTrace.timestamp)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Duration:</span>
                      </div>
                      <span className="text-sm font-medium">{formatDuration(selectedTrace.duration)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Cost:</span>
                      </div>
                      <span className="text-sm font-medium">${selectedTrace.cost?.toFixed(4) || '0.0000'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Tokens:</span>
                      </div>
                      <span className="text-sm font-medium">{selectedTrace.tokens?.toLocaleString() || '0'}</span>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Model:</span>
                      </div>
                      <span className="text-sm font-medium">{selectedTrace.model || 'N/A'}</span>
                    </div>
                  </div>

                  {selectedTrace.tags && selectedTrace.tags.length > 0 && (
                    <div className="pt-3 border-t">
                      <div className="flex items-start gap-2">
                        <span className="text-sm text-muted-foreground mt-0.5">Tags:</span>
                        <div className="flex flex-wrap gap-2">
                          {selectedTrace.tags.map((tag, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Tabs defaultValue="input" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="input">Input</TabsTrigger>
                  <TabsTrigger value="output">Output</TabsTrigger>
                  <TabsTrigger value="metadata">Metadata</TabsTrigger>
                </TabsList>
                
                <TabsContent value="input" className="space-y-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Input Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                        {formatJson(selectedTrace.input)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="output" className="space-y-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Output Data</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                        {formatJson(selectedTrace.output)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="metadata" className="space-y-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm">Metadata</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-64">
                        {formatJson(selectedTrace.metadata)}
                      </pre>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            // List view of all traces
            <div className="space-y-2">
              {traces.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No trace details available
                </div>
              ) : (
                traces.slice(0, displayCount).map((trace) => (
                  <Card 
                    key={trace.id} 
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => setSelectedTrace(trace)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{trace.name}</span>
                            {trace.status && (
                              <Badge 
                                variant={trace.status === 'success' ? 'default' : 'destructive'}
                                className="text-xs"
                              >
                                {trace.status}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(trace.duration)}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ${trace.cost?.toFixed(4) || '0'}
                            </span>
                            <span className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {(trace.tokens || 0).toLocaleString()}
                            </span>
                            <span>{new Date(trace.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Code className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              {traces.length > displayCount && (
                <div className="flex justify-center py-4">
                  <Button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    variant="outline"
                    className="w-full max-w-xs"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Load More ({traces.length - displayCount} remaining)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
