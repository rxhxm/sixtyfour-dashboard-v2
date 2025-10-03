'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Workflow, 
  Activity, 
  CheckCircle, 
  XCircle, 
  Clock, 
  TrendingUp,
  ChevronDown,
  ChevronRight,
  PlayCircle,
  Loader2,
  FileText,
  Download
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface WorkflowData {
  id: string
  name: string
  description: string
  status: string
  user_uuid: string
  created_at: string
  updated_at: string
  blocks: any[]
  stats: {
    totalRuns: number
    completedRuns: number
    failedRuns: number
    successRate: number
    avgDuration: number
    lastRun: any
    totalRowsProcessed: number
  }
}

interface WorkflowRun {
  job_id: string
  workflow_id: string
  workflow_name: string
  status: string
  created_at: string
  started_at: string
  completed_at: string
  duration_ms: number
  trigger_type: string
  parsed_metrics: any
  jobs: any[]
  blocks: any[]
  block_count: number
}

export default function WorkflowsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  const [expandedRun, setExpandedRun] = useState<string>('')
  const [showRunDetails, setShowRunDetails] = useState(false)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  
  // Check authentication
  useEffect(() => {
    const isAuthenticated = sessionStorage.getItem('authenticated')
    if (isAuthenticated !== 'true') {
      router.push('/auth/signin')
    }
  }, [router])
  
  // Fetch workflow data
  useEffect(() => {
    fetchData()
  }, [])
  
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch workflows and runs in parallel
      const [workflowsRes, runsRes] = await Promise.all([
        fetch('/api/workflows'),
        fetch('/api/workflow-runs?limit=100')
      ])
      
      if (workflowsRes.ok) {
        const data = await workflowsRes.json()
        setWorkflows(data.workflows || [])
        setSummary(data.summary)
      }
      
      if (runsRes.ok) {
        const data = await runsRes.json()
        setRecentRuns(data.runs || [])
      }
    } catch (error) {
      console.error('Error fetching workflow data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Format duration
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }
  
  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`
    return `${Math.floor(diffMins / 1440)}d ago`
  }
  
  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
      case 'succeeded':
        return 'text-green-600 bg-green-50'
      case 'failed':
        return 'text-red-600 bg-red-50'
      case 'running':
        return 'text-blue-600 bg-blue-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }
  
  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
      case 'succeeded':
        return <CheckCircle className="h-4 w-4" />
      case 'failed':
        return <XCircle className="h-4 w-4" />
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <p className="text-sm font-medium">Loading workflows...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Workflows Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor workflow executions, performance, and results
          </p>
        </div>
        
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Workflows</CardTitle>
              <Workflow className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalWorkflows || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Created workflows
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.totalRuns || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Workflow executions
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary?.successRate?.toFixed(1) || 0}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.completedRuns || 0} completed
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatDuration(summary?.avgRunDuration || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per execution
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Workflows Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Workflow className="h-5 w-5" />
              All Workflows ({workflows.length})
            </CardTitle>
            <CardDescription>
              Click a workflow to view execution details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left">Workflow Name</th>
                    <th className="p-3 text-left">Description</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3 text-center">Runs</th>
                    <th className="p-3 text-center">Success Rate</th>
                    <th className="p-3 text-right">Avg Duration</th>
                    <th className="p-3 text-left">Last Run</th>
                  </tr>
                </thead>
                <tbody>
                  {workflows.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className={`border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                        selectedWorkflow === workflow.id ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedWorkflow(workflow.id === selectedWorkflow ? '' : workflow.id)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <ChevronRight className={`h-4 w-4 transition-transform ${
                            selectedWorkflow === workflow.id ? 'rotate-90' : ''
                          }`} />
                          <span className="font-medium">{workflow.name}</span>
                        </div>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground max-w-xs truncate">
                        {workflow.description}
                      </td>
                      <td className="p-3 text-center">
                        <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
                          {workflow.status}
                        </Badge>
                      </td>
                      <td className="p-3 text-center font-mono">
                        {workflow.stats.totalRuns}
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-mono">{workflow.stats.successRate.toFixed(0)}%</span>
                          {workflow.stats.successRate === 100 && (
                            <CheckCircle className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </td>
                      <td className="p-3 text-right font-mono">
                        {formatDuration(workflow.stats.avgDuration)}
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {workflow.stats.lastRun ? formatDate(workflow.stats.lastRun.completed_at) : 'Never'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Workflow Details (Expanded) */}
            {selectedWorkflow && workflows.find(w => w.id === selectedWorkflow) && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg animate-in slide-in-from-top-2">
                <div className="space-y-4">
                  <h3 className="font-semibold">Workflow Configuration</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {workflows.find(w => w.id === selectedWorkflow)?.blocks?.map((block: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded border">
                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                          {idx + 1}
                        </div>
                        <div>
                          <p className="font-medium text-xs">{block.block_name}</p>
                          <p className="text-xs text-muted-foreground">{block.block_type}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        
        {/* Recent Runs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5" />
              Recent Workflow Runs ({recentRuns.length})
            </CardTitle>
            <CardDescription>
              Latest workflow executions with performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentRuns.map((run) => (
                <Card
                  key={run.job_id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => {
                    setSelectedRun(run)
                    setShowRunDetails(true)
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{run.workflow_name}</h4>
                          <Badge className={getStatusColor(run.status)}>
                            <div className="flex items-center gap-1">
                              {getStatusIcon(run.status)}
                              {run.status}
                            </div>
                          </Badge>
                          <Badge variant="outline">{run.trigger_type}</Badge>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDuration(run.duration_ms)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {run.block_count} blocks
                          </div>
                          {run.parsed_metrics?.row_count && (
                            <div className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {run.parsed_metrics.row_count} rows
                            </div>
                          )}
                          <span>{formatDate(run.created_at)}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Run Details Modal */}
        <Dialog open={showRunDetails} onOpenChange={setShowRunDetails}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5" />
                Workflow Run Details
              </DialogTitle>
            </DialogHeader>
            
            {selectedRun && (
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Workflow: {selectedRun.workflow_name}</h3>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <p className="font-medium">{selectedRun.status}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Duration</p>
                      <p className="font-medium">{formatDuration(selectedRun.duration_ms)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rows Processed</p>
                      <p className="font-medium">{selectedRun.parsed_metrics?.row_count || 'N/A'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Block Execution Timeline</h4>
                  <div className="space-y-2">
                    {selectedRun.jobs?.map((job: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-background rounded border">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                          {job.sequence_number}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-sm">{job.block_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {job.started_at && job.completed_at ? 
                              formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime())
                              : 'N/A'}
                          </p>
                        </div>
                        <Badge variant={job.status === 'succeeded' ? 'default' : 'destructive'}>
                          {job.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
