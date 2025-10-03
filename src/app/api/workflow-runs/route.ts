import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workflowId = searchParams.get('workflowId')
    const userId = searchParams.get('userId')
    const limit = parseInt(searchParams.get('limit') || '100')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // Fetch workflow runs
    let runsQuery = supabaseAdmin
      .from('workflow_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (workflowId) {
      runsQuery = runsQuery.eq('workflow_id', workflowId)
    }
    
    if (userId) {
      runsQuery = runsQuery.eq('user_id', userId)
    }
    
    const { data: runs, error: runsError } = await runsQuery
    
    if (runsError) {
      console.error('Error fetching runs:', runsError)
      return NextResponse.json({ error: 'Failed to fetch runs' }, { status: 500 })
    }
    
    // Fetch associated jobs for each run
    const runIds = runs?.map((run: any) => run.job_id).filter(Boolean) || []
    
    const { data: jobs, error: jobsError } = await supabaseAdmin
      .from('workflow_jobs')
      .select('*')
      .in('job_id', runIds)
      .order('sequence_number', { ascending: true })
    
    if (jobsError) {
      console.error('Error fetching jobs:', jobsError)
    }
    
    // Fetch workflow details for names
    const workflowIds = runs?.map((run: any) => run.workflow_id).filter(Boolean) || []
    
    const { data: workflows, error: workflowsError } = await supabaseAdmin
      .from('workflows')
      .select('id, name, description')
      .in('id', workflowIds)
    
    if (workflowsError) {
      console.error('Error fetching workflow names:', workflowsError)
    }
    
    // Enrich runs with workflow info and job details
    const enrichedRuns = runs?.map((run: any) => {
      const workflow = workflows?.find((w: any) => w.id === run.workflow_id)
      const runJobs = jobs?.filter((job: any) => job.job_id === run.job_id) || []
      
      // Parse metrics
      let metrics = {}
      try {
        if (run.metrics) {
          metrics = typeof run.metrics === 'string' ? JSON.parse(run.metrics) : run.metrics
        }
      } catch (e) {}
      
      return {
        ...run,
        workflow_name: workflow?.name || 'Unknown Workflow',
        workflow_description: workflow?.description,
        jobs: runJobs,
        parsed_metrics: metrics,
        block_count: Array.isArray(run.blocks) ? run.blocks.length : 0
      }
    })
    
    return NextResponse.json({
      runs: enrichedRuns,
      total: runs?.length || 0,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Error in workflow-runs API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow runs' },
      { status: 500 }
    )
  }
}
