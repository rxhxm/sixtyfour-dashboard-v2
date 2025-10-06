import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch ALL workflows (no limit for accurate count)
    let workflowQuery = supabaseAdmin
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (userId) {
      workflowQuery = workflowQuery.eq('user_uuid', userId)
    }
    
    const { data: workflows, error: workflowsError } = await workflowQuery
    
    if (workflowsError) {
      console.error('Error fetching workflows:', workflowsError)
      return NextResponse.json({ error: 'Failed to fetch workflows' }, { status: 500 })
    }
    
    // Fetch workflow runs to get execution stats (get ALL runs for accurate count)
    const { data: runs, error: runsError } = await supabaseAdmin
      .from('workflow_runs')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (runsError) {
      console.error('Error fetching runs:', runsError)
    }
    
    // Get total job count without fetching all data
    const { count: totalJobsCount } = await supabaseAdmin
      .from('workflow_jobs')
      .select('*', { count: 'exact', head: true })
    
    // Fetch recent workflow jobs for block usage statistics (limit to recent for performance)
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('workflow_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5000) // Fetch recent jobs for block stats, but get accurate total count above
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }
    
    // Fetch user-org mappings (note: table name has hyphen)
    const { data: userOrgs, error: userOrgsError } = await supabaseAdmin
      .from('users-org')
      .select('*')
    
    if (userOrgsError) {
      console.error('Error fetching user-orgs:', userOrgsError)
    }
    
    // Create a user-to-org map
    const userToOrgMap = new Map()
    userOrgs?.forEach((mapping: any) => {
      // The 'id' field in users-org table is actually the user_id
      userToOrgMap.set(mapping.id, mapping.org_id)
    })
    
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
      
      // Get user org
      const userOrg = userToOrgMap.get(workflow.user_uuid) || 'Unknown'
      
      // Create a display name (use org or extract from user_uuid)
      const userName = userOrg !== 'Unknown' ? userOrg : workflow.user_uuid?.substring(0, 8)
      
      // Get runs for this specific workflow
      const workflowSpecificRuns = workflowRuns.map((run: any) => ({
        job_id: run.job_id,
        status: run.status,
        created_at: run.created_at,
        completed_at: run.completed_at,
        duration_ms: run.duration_ms,
        trigger_type: run.trigger_type
      }))
      
      return {
        ...workflow,
        user_org: userOrg,
        user_name: userName,
        runs: workflowSpecificRuns, // Include actual runs for expansion
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
    
    // Calculate block usage statistics
    const blockUsage = new Map()
    jobs?.forEach((job: any) => {
      const blockName = job.block_name
      if (blockName) {
        const current = blockUsage.get(blockName) || { count: 0, successes: 0, totalDuration: 0 }
        current.count += 1
        if (job.status === 'succeeded') current.successes += 1
        if (job.started_at && job.completed_at) {
          current.totalDuration += new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        }
        blockUsage.set(blockName, current)
      }
    })
    
    const topBlocks = Array.from(blockUsage.entries())
      .map(([name, stats]) => ({
        name,
        count: stats.count,
        successRate: (stats.successes / stats.count) * 100,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
    
    // Group by organization
    const orgStats = new Map()
    enrichedWorkflows?.forEach((workflow: any) => {
      const org = workflow.user_org
      if (!orgStats.has(org)) {
        orgStats.set(org, {
          org_id: org,
          workflows: 0,
          runs: 0,
          lastActivity: null
        })
      }
      const stats = orgStats.get(org)
      stats.workflows += 1
      stats.runs += workflow.stats.totalRuns
      if (workflow.stats.lastRun?.completed_at) {
        if (!stats.lastActivity || workflow.stats.lastRun.completed_at > stats.lastActivity) {
          stats.lastActivity = workflow.stats.lastRun.completed_at
        }
      }
    })
    
    // Calculate summary statistics
      // Calculate accurate statistics
      const completedCount = runs?.filter((r: any) => r.status === 'completed').length || 0
      const failedCount = runs?.filter((r: any) => r.status === 'failed').length || 0
      const cancelledCount = runs?.filter((r: any) => r.status === 'cancelled').length || 0
      const runningCount = runs?.filter((r: any) => r.status === 'running').length || 0
      const queuedCount = runs?.filter((r: any) => r.status === 'queued').length || 0
      
      // Only count FINISHED runs (completed + failed + cancelled) for success rate
      const finishedRuns = completedCount + failedCount + cancelledCount
      
      const summary = {
        totalWorkflows: workflows?.length || 0,
        totalRuns: runs?.length || 0,
        totalJobs: totalJobsCount || 0, // Use accurate count from database
        completedRuns: completedCount,
        failedRuns: failedCount,
        cancelledRuns: cancelledCount,
        runningRuns: runningCount,
        queuedRuns: queuedCount,
        avgRunDuration: runs && runs.length > 0
          ? runs.filter((r: any) => r.duration_ms > 0).reduce((sum: number, run: any) => sum + (run.duration_ms || 0), 0) / runs.filter((r: any) => r.duration_ms > 0).length
          : 0,
        // Success rate = completed / (completed + failed + cancelled) - excludes running/queued
        successRate: finishedRuns > 0
          ? (completedCount / finishedRuns) * 100
          : 0,
        topBlocks,
        organizationStats: Array.from(orgStats.values())
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
