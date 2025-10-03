import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '50')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch workflows with their latest run data
    let workflowQuery = supabaseAdmin
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (userId) {
      workflowQuery = workflowQuery.eq('user_uuid', userId)
    }
    
    const { data: workflows, error: workflowsError } = await workflowQuery
    
    if (workflowsError) {
      console.error('Error fetching workflows:', workflowsError)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }
    
    // Fetch workflow runs to get execution stats
    const { data: runs, error: runsError } = await supabaseAdmin
      .from('workflow_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500)
    
    if (runsError) {
      console.error('Error fetching runs:', runsError)
    }
    
    // Fetch workflow jobs for detailed metrics
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('workflow_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }
    
    // Enrich workflows with run statistics
    const enrichedWorkflows = workflows?.map((workflow: any) => {
      // Find all runs for this workflow
      const workflowRuns = runs?.filter((run: any) => run.workflow_id === workflow.id) || []
      const completedRuns = workflowRuns.filter((run: any) => run.status === 'completed')
      const failedRuns = workflowRuns.filter((run: any) => run.status === 'failed')
      
      // Get latest run
      const latestRun = workflowRuns[0]
      
      // Calculate average duration
      const avgDuration = completedRuns.length > 0
        ? completedRuns.reduce((sum: number, run: any) => sum + (run.duration_ms || 0), 0) / completedRuns.length
        : 0
      
      // Parse metrics from latest run
      let totalRowsProcessed = 0
      try {
        if (latestRun?.metrics) {
          const metrics = JSON.parse(latestRun.metrics)
          totalRowsProcessed = metrics.row_count || 0
        }
      } catch (e) {}
      
      return {
        ...workflow,
        stats: {
          totalRuns: workflowRuns.length,
          completedRuns: completedRuns.length,
          failedRuns: failedRuns.length,
          successRate: workflowRuns.length > 0 
            ? (completedRuns.length / workflowRuns.length) * 100 
            : 0,
          avgDuration,
          lastRun: latestRun ? {
            status: latestRun.status,
            completed_at: latestRun.completed_at,
            duration_ms: latestRun.duration_ms
          } : null,
          totalRowsProcessed
        }
      }
    })
    
    // Calculate summary statistics
    const summary = {
      totalWorkflows: workflows?.length || 0,
      totalRuns: runs?.length || 0,
      totalJobs: jobs?.length || 0,
      completedRuns: runs?.filter((r: any) => r.status === 'completed').length || 0,
      failedRuns: runs?.filter((r: any) => r.status === 'failed').length || 0,
      runningRuns: runs?.filter((r: any) => r.status === 'running').length || 0,
      avgRunDuration: runs && runs.length > 0
        ? runs.reduce((sum: number, run: any) => sum + (run.duration_ms || 0), 0) / runs.length
        : 0,
      successRate: runs && runs.length > 0
        ? (runs.filter((r: any) => r.status === 'completed').length / runs.length) * 100
        : 0
    }
    
    return NextResponse.json({
      workflows: enrichedWorkflows,
      summary,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in workflows API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow data' },
      { status: 500 }
    )
  }
}
