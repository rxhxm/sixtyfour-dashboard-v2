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
  ChevronUp,
  PlayCircle,
  Loader2,
  FileText,
  Download
} from 'lucide-react'
import { getBlockColor } from '@/lib/workflow-colors'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ResizableDialog } from '@/components/ui/resizable-dialog'
import { isAuthorizedEmail } from '@/lib/auth-guard'
import { createClient } from '@/lib/supabase/client'
import React from 'react'

interface WorkflowData {
  id: string
  name: string
  description: string
  status: string
  user_uuid: string
  user_org?: string
  created_at: string
  updated_at: string
  blocks: any[]
  runs?: any[]
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
  user_org?: string
  user_name?: string
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
  const supabase = React.useMemo(() => createClient(), [])
  
  // CRITICAL: Block rendering until auth verified
  const [authVerified, setAuthVerified] = useState(false)
  const [authChecking, setAuthChecking] = useState(true)
  
  const [loading, setLoading] = useState(true)
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [recentRuns, setRecentRuns] = useState<WorkflowRun[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [selectedOrg, setSelectedOrg] = useState<string>('')
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('')
  const [showRunDetails, setShowRunDetails] = useState(false)
  const [selectedRun, setSelectedRun] = useState<WorkflowRun | null>(null)
  const [filterView, setFilterView] = useState<'all' | 'org' | 'workflow'>('all')
  const [csvResults, setCsvResults] = useState<any>(null)
  const [loadingCsv, setLoadingCsv] = useState(false)
  const [showAllBlocks, setShowAllBlocks] = useState(false)
  const [showAllOrgs, setShowAllOrgs] = useState(false)
  const [orgFilteredRuns, setOrgFilteredRuns] = useState<WorkflowRun[]>([])
  const [loadingOrgRuns, setLoadingOrgRuns] = useState(false)
  
  // Fetch runs for a specific org's workflows
  const fetchOrgRuns = async (orgId: string) => {
    if (!orgId) {
      setOrgFilteredRuns([])
      return
    }
    setLoadingOrgRuns(true)
    try {
      // Get all workflow IDs for this org
      const orgWorkflowIds = workflows
        .filter(w => w.user_org === orgId)
        .map(w => w.id)
      
      if (orgWorkflowIds.length === 0) {
        setOrgFilteredRuns([])
        return
      }
      
      // Fetch runs for all these workflows
      const runsPromises = orgWorkflowIds.map(wfId => 
        fetch(`/api/workflow-runs?workflowId=${wfId}&limit=1000`).then(r => r.json())
      )
      const results = await Promise.all(runsPromises)
      
      // Combine all runs and sort by date
      const allOrgRuns = results
        .flatMap(r => r.runs || [])
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      
      setOrgFilteredRuns(allOrgRuns)
    } catch (error) {
      console.error('Error fetching org runs:', error)
    } finally {
      setLoadingOrgRuns(false)
    }
  }
  
  // When org selection changes, fetch that org's runs
  useEffect(() => {
    if (selectedOrg && workflows.length > 0) {
      fetchOrgRuns(selectedOrg)
    } else {
      setOrgFilteredRuns([])
    }
  }, [selectedOrg, workflows])
  
  // Fetch CSV results
  const fetchCsvResults = async (jobId: string) => {
    setLoadingCsv(true)
    setCsvResults(null)
    try {
      const res = await fetch(`/api/workflow-results?job_id=${jobId}`)
      const data = await res.json()
      setCsvResults(data)
    } catch (error) {
      console.error('Failed to fetch CSV:', error)
    } finally {
      setLoadingCsv(false)
    }
  }
  
  // CRITICAL: HARDCODED AUTH CHECK - BLOCKS RENDERING
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session || !isAuthorizedEmail(session.user.email)) {
        console.log('🚨 UNAUTHORIZED ACCESS TO WORKFLOWS:', session?.user.email || 'no session')
        if (session) await supabase.auth.signOut()
        window.location.href = '/auth/signin'
        return
      }
      
      console.log('✅ Authorized for workflows:', session.user.email)
      setAuthVerified(true)
      setAuthChecking(false)
    }
    checkAuth()
  }, [supabase])
  
  // Fetch workflow data
  useEffect(() => {
    if (authVerified) {
      fetchData()
      
      // After workflows start loading, preload ALL other tabs in background
      setTimeout(() => {
        console.log('🔄 Preloading all other tabs in background...')
        
        // Preload API Usage
        import('@/lib/preload-api-usage').then(({ preloadApiUsageData }) => {
          preloadApiUsageData()
        })
        
        // Preload Credits Management (after 3 seconds)
        setTimeout(() => {
          console.log('🔄 Preloading Credits Management...')
          fetch('/api/credits?limit=1000&offset=0')
            .then(r => r.json())
            .then(data => {
              sessionStorage.setItem('credits_cache', JSON.stringify({
                subscriptions: data.data,
                timestamp: Date.now()
              }))
              console.log('✅ Credits Management preloaded')
            })
            .catch(e => console.warn('Credits preload failed:', e))
        }, 3000)
        
        // Preload Platform Access (after 5 seconds)
        setTimeout(() => {
          console.log('🔄 Preloading Platform Access...')
          fetch('/api/posthog/feature-flags?key=platform_access')
            .then(r => r.json())
            .then(data => {
              let pattern = ''
              let emails: string[] = []
              
              if (data.filters?.groups) {
                const set1 = data.filters.groups[0]
                if (set1?.properties?.[0]?.value) {
                  pattern = set1.properties[0].value as string
                }
                const set2 = data.filters.groups[1]
                if (set2?.properties?.[0]?.value && Array.isArray(set2.properties[0].value)) {
                  emails = set2.properties[0].value
                }
              }
              
              sessionStorage.setItem('platform_cache', JSON.stringify({
                featureFlag: data,
                set1Pattern: pattern,
                set2Emails: emails,
                timestamp: Date.now()
              }))
              console.log('✅ Platform Access preloaded')
            })
            .catch(e => console.warn('Platform preload failed:', e))
        }, 5000)
        
      }, 2000) // Wait 2 seconds after workflows load, then start preloading
    }
  }, [authVerified])
  
  const fetchData = async () => {
    // Check cache first (instant!)
    const cached = sessionStorage.getItem('workflows_cache')
    if (cached) {
      try {
        const { workflows, runs, summary, timestamp } = JSON.parse(cached)
        const age = Date.now() - timestamp
        
        // Use cache if less than 10 minutes old
        if (age < 10 * 60 * 1000) {
          console.log('⚡ Using cached workflows data')
          setWorkflows(workflows || [])
          setRecentRuns(runs || [])
          setSummary(summary)
          setLoading(false)
          return
        }
      } catch (e) {
        console.warn('Failed to parse workflows cache')
      }
    }
    
    setLoading(true)
    try {
      // Fetch workflows and runs in parallel
      const [workflowsRes, runsRes] = await Promise.all([
        fetch('/api/workflows'),
        fetch('/api/workflow-runs?limit=100')
      ])
      
      let workflowsData = null
      let runsData = null
      let summaryData = null
      
      if (workflowsRes.ok) {
        const data = await workflowsRes.json()
        workflowsData = data.workflows || []
        summaryData = data.summary
        setWorkflows(workflowsData)
        setSummary(summaryData)
      }
      
      if (runsRes.ok) {
        const data = await runsRes.json()
        runsData = data.runs || []
        setRecentRuns(runsData)
      }
      
      // Cache the data
      sessionStorage.setItem('workflows_cache', JSON.stringify({
        workflows: workflowsData,
        runs: runsData,
        summary: summaryData,
        timestamp: Date.now()
      }))
      console.log('💾 Workflows data cached')
      
    } catch (error) {
      console.error('Error fetching workflow data:', error)
    } finally {
      setLoading(false)
    }
  }
  
  // Format duration
  const formatDuration = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined) return '-'
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
  
  // Auth check first
  if (authChecking || !authVerified) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
          </div>
          <p className="text-sm font-medium">Verifying access...</p>
        </div>
      </div>
    )
  }

  // Then loading check
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center space-y-4">
            <div className="relative">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-muted border-t-primary mx-auto"></div>
              <div className="absolute inset-0 animate-ping rounded-full h-12 w-12 border border-primary opacity-20 mx-auto"></div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Loading workflows</p>
              <p className="text-xs text-muted-foreground">Fetching workflow data...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  // Main content
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
              <div className="text-2xl font-bold">
                {(summary?.totalWorkflows || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.fetchedWorkflows && summary.fetchedWorkflows < summary.totalWorkflows 
                  ? `${summary.fetchedWorkflows.toLocaleString()} loaded` 
                  : 'Created workflows'}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Runs</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {(summary?.totalRuns || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary?.fetchedRuns && summary.fetchedRuns < summary.totalRuns 
                  ? `${summary.fetchedRuns.toLocaleString()} loaded` 
                  : 'Workflow executions'}
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
        
        {/* Most Used Blocks & Organization Activity - Side by Side */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Top Blocks Card */}
          {summary?.topBlocks && summary.topBlocks.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setShowAllBlocks(!showAllBlocks)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      Most Used Blocks
                      {showAllBlocks ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                    <CardDescription>
                      {showAllBlocks ? `All ${summary.topBlocks.length} blocks by usage` : 'Top 5 workflow blocks by usage'}
                    </CardDescription>
                  </div>
                  {summary.topBlocks.length > 5 && (
                    <Button variant="ghost" size="sm" className="text-xs">
                      {showAllBlocks ? 'Show Less' : `Show All (${summary.topBlocks.length})`}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`space-y-2 ${showAllBlocks ? 'max-h-96 overflow-y-auto' : ''}`}>
                  {summary.topBlocks.slice(0, showAllBlocks ? undefined : 5).map((block: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono bg-primary/10 px-2 py-1 rounded">#{idx + 1}</span>
                        <span className="font-medium text-sm">{block.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-muted-foreground">{block.count} uses</span>
                        <span className="font-mono">{block.successRate.toFixed(0)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Organization Activity */}
          {summary?.organizationStats && summary.organizationStats.length > 0 && (
            <Card>
              <CardHeader className="cursor-pointer" onClick={() => setShowAllOrgs(!showAllOrgs)}>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      Organization Activity
                      {showAllOrgs ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </CardTitle>
                    <CardDescription>
                      {showAllOrgs ? `All ${summary.organizationStats.length} orgs by last activity` : 'Top 5 orgs by last activity'}
                    </CardDescription>
                  </div>
                  {summary.organizationStats.length > 5 && (
                    <Button variant="ghost" size="sm" className="text-xs">
                      {showAllOrgs ? 'Show Less' : `Show All (${summary.organizationStats.length})`}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className={`space-y-2 ${showAllOrgs ? 'max-h-96 overflow-y-auto' : ''}`}>
                  {summary.organizationStats
                    .sort((a: any, b: any) => new Date(b.lastActivity || 0).getTime() - new Date(a.lastActivity || 0).getTime())
                    .slice(0, showAllOrgs ? undefined : 5)
                    .map((org: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">{org.org_id}</Badge>
                          <span className="text-xs text-muted-foreground">{org.workflows} workflows • {org.runs} runs</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {org.lastActivity ? formatDate(org.lastActivity) : 'Never'}
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Workflow Runs - Unified View */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Workflow Executions
                </CardTitle>
                <CardDescription>
                  {selectedOrg 
                    ? `Filtered by organization: ${selectedOrg}` 
                    : selectedWorkflow
                    ? `Filtered by workflow`
                    : 'All recent workflow runs - Click org or workflow to filter'}
                </CardDescription>
              </div>
              {(selectedOrg || selectedWorkflow) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedOrg('')
                    setSelectedWorkflow('')
                    setFilterView('all')
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 mb-4">
              {summary?.organizationStats?.slice(0, 10).map((org: any) => (
                <Button
                  key={org.org_id}
                  variant={selectedOrg === org.org_id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setSelectedOrg(selectedOrg === org.org_id ? '' : org.org_id)
                    setSelectedWorkflow('')
                  }}
                >
                  {org.org_id}
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {org.runs}
                  </Badge>
                </Button>
              ))}
            </div>
            
            {/* Runs List */}
            <div className="space-y-2">
              {/* Show loading state when fetching org-specific runs */}
              {loadingOrgRuns && selectedOrg && (
                <div className="text-center py-4 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Loading runs for {selectedOrg}...
                </div>
              )}
              {/* Use org-specific runs when org is selected, otherwise filter global runs */}
              {(selectedOrg ? orgFilteredRuns : recentRuns
                .filter(run => {
                  // Filter by selected workflow
                  if (selectedWorkflow) {
                    return run.workflow_id === selectedWorkflow
                  }
                  return true
                }))
                .map((run) => (
                  <Card
                    key={run.job_id}
                    className="cursor-pointer hover:shadow-md transition-all"
                    onClick={() => {
                      setSelectedRun(run)
                      setShowRunDetails(true)
                      fetchCsvResults(run.job_id)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        {/* Organization Badge on the left */}
                        <div className="flex items-center gap-3">
                          <div className="min-w-[100px]">
                            <Badge variant="secondary" className="w-full justify-center font-medium">
                              {run.user_org || 'Unknown'}
                            </Badge>
                          </div>
                          <div className="w-px h-12 bg-border" /> {/* Vertical separator */}
                        </div>
                        
                        {/* Main content */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{run.workflow_name}</h4>
                            <Badge className={getStatusColor(run.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(run.status)}
                                {run.status}
                              </div>
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDuration(run.duration_ms)}
                            </div>
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {run.block_count ? `${run.block_count} blocks` : '-'}
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
            
            {/* REMOVED OLD TABLE AND DUPLICATE RECENT RUNS - Now unified above */}
            {selectedWorkflow && workflows.find(w => w.id === selectedWorkflow) && false && (
              <div className="mt-4 p-4 bg-muted/30 rounded-lg animate-in slide-in-from-top-2">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Workflow Runs for: {workflows.find(w => w.id === selectedWorkflow)?.name}</h3>
                    <Badge variant="outline">
                      Organization: {workflows.find(w => w.id === selectedWorkflow)?.user_org || 'Unknown'}
                    </Badge>
                  </div>
                  
                  {workflows.find(w => w.id === selectedWorkflow)?.runs && (workflows.find(w => w.id === selectedWorkflow)?.runs?.length || 0) > 0 ? (
                    <div className="space-y-2">
                      {workflows.find(w => w.id === selectedWorkflow)?.runs?.map((run: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-background rounded border hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-4">
                            <div className="text-sm text-muted-foreground">#{idx + 1}</div>
                            <Badge className={getStatusColor(run.status)}>
                              <div className="flex items-center gap-1">
                                {getStatusIcon(run.status)}
                                {run.status}
                              </div>
                            </Badge>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Duration:</span>
                              <span className="ml-2 font-mono">{formatDuration(run.duration_ms)}</span>
                            </div>
                            <div className="text-sm">
                              <span className="text-muted-foreground">Trigger:</span>
                              <span className="ml-2 font-medium">{run.trigger_type}</span>
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {formatDate(run.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No runs found for this workflow
                    </div>
                  )}
                  
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-semibold mb-2">Workflow Configuration</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {workflows.find(w => w.id === selectedWorkflow)?.blocks?.map((block: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-2 p-2 bg-background rounded border text-xs">
                          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {idx + 1}
                          </div>
                          <div>
                            <p className="font-medium">{block.block_name}</p>
                            <p className="text-muted-foreground">{block.block_type}</p>
                          </div>
                        </div>
                      ))}
                    </div>
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
                    fetchCsvResults(run.job_id)
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
                            {run.block_count ? `${run.block_count} blocks` : '-'}
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
        <ResizableDialog 
          open={showRunDetails} 
          onOpenChange={setShowRunDetails}
          title="Workflow Run Details"
        >
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
                  <h4 className="font-semibold mb-4">Block Execution Timeline</h4>
                  <div className="flex items-center gap-1 overflow-x-auto pb-4">
                    {selectedRun.jobs?.map((job: any, idx: number) => (
                      <div key={idx} className="flex items-center">
                        <div className={`${getBlockColor(job.block_name)} text-white rounded-md p-2 min-w-[120px] shadow-sm`}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[10px] font-medium opacity-75">
                              {job.sequence_number}
                            </span>
                            <CheckCircle className="h-3 w-3 opacity-75" />
                          </div>
                          <p className="font-semibold text-xs mb-1">{job.block_name}</p>
                          <div className="flex items-center gap-1 text-[10px] opacity-75">
                            <Clock className="h-2.5 w-2.5" />
                            {job.started_at && job.completed_at ? 
                              formatDuration(new Date(job.completed_at).getTime() - new Date(job.started_at).getTime())
                              : 'N/A'}
                          </div>
                        </div>
                        {idx < (selectedRun.jobs?.length || 0) - 1 && (
                          <div className="w-3 h-0.5 bg-gray-300" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* CSV Data */}
                <div>
                  <h4 className="font-semibold mb-4">Workflow Data</h4>
                  {loadingCsv ? (
                    <div className="text-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Loading CSV data...</p>
                    </div>
                  ) : csvResults?.allResults && csvResults.allResults.length > 0 ? (
                    <div className="space-y-4">
                      {csvResults.allResults.map((result: any, idx: number) => result.headers ? (
                        <Card key={idx}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-sm">Block {result.block_number} Output</CardTitle>
                              <div className="flex gap-2">
                                <Badge variant="outline">{result.row_count} rows</Badge>
                                <Button variant="ghost" size="sm" onClick={() => {
                                  const blob = new Blob([result.raw], { type: 'text/csv' })
                                  const url = window.URL.createObjectURL(blob)
                                  const a = document.createElement('a')
                                  a.href = url
                                  a.download = `block-${result.block_number}-${selectedRun.job_id}.csv`
                                  a.click()
                                }}>
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="border rounded overflow-auto max-h-64">
                              <table className="w-full text-sm">
                                <thead className="bg-muted sticky top-0">
                                  <tr>
                                    {result.headers.map((h: string, i: number) => (
                                      <th key={i} className="px-3 py-2 text-left font-medium">{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {result.preview.slice(0, 10).map((row: any, i: number) => (
                                    <tr key={i} className="border-t">
                                      {result.headers.map((h: string, j: number) => (
                                        <td key={j} className="px-3 py-2">{row[h]}</td>
                                      ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              Showing first 10 of {result.totalRows} rows
                            </p>
                          </CardContent>
                        </Card>
                      ) : null)}
                    </div>
                  ) : csvResults?.error || csvResults?.message ? (
                    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
                      <p className="text-sm text-orange-800 font-medium">{csvResults.message || 'Unable to load CSV data'}</p>
                      {csvResults.error && (
                        <p className="text-xs text-orange-600 mt-1">{csvResults.error}</p>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No CSV data available</p>
                  )}
                </div>
              </div>
            )}
        </ResizableDialog>
      </div>
    </DashboardLayout>
  )
}
