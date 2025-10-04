import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const jobId = searchParams.get('job_id') || searchParams.get('jobId')
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID required' }, { status: 400 })
    }
    
    // Fetch workflow results for this job
    console.log('Fetching results for job_id:', jobId)
    const { data: results, error } = await supabaseAdmin
      .from('workflow_results')
      .select('*')
      .eq('workflow_run_job_id', jobId)
      .order('block_number', { ascending: true })
    
    if (error) {
      console.error('Error fetching workflow results:', error)
      return NextResponse.json({ error: 'Failed to fetch results' }, { status: 500 })
    }
    
    console.log(`Found ${results?.length || 0} results for job ${jobId}`)
    
    // Fetch CSV content from Supabase Storage
    const enrichedResults = await Promise.all(
      (results || []).map(async (result: any) => {
        try {
          // Download CSV from storage
          const { data: csvData, error: storageError } = await supabaseAdmin
            .storage
            .from(result.storage_bucket)
            .download(result.storage_url)
          
          if (storageError) {
            console.error('Storage error:', storageError)
            return { ...result, csvData: null, error: 'Failed to fetch CSV' }
          }
          
          // Convert blob to text
          const text = await csvData.text()
          
          // Parse CSV (simple parsing - split by lines and commas)
          const lines = text.split('\n').filter((line: string) => line.trim())
          const headers = lines[0]?.split(',') || []
          const rows = lines.slice(1).map((line: string) => {
            const values = line.split(',')
            return headers.reduce((obj: any, header: string, idx: number) => {
              obj[header.trim()] = values[idx]?.trim() || ''
              return obj
            }, {})
          })
          
          return {
            ...result,
            headers,
            preview: rows.slice(0, 100), // First 100 rows for preview
            totalRows: rows.length,
            raw: text // Include raw CSV for download
          }
        } catch (e) {
          console.error('Error processing result:', e)
          return { ...result, csvData: null, error: 'Failed to process CSV' }
        }
      })
    )
    
    // Separate input and output results
    const inputResult = enrichedResults.find((r: any) => r.result_type === 'input')
    const outputResult = enrichedResults.find((r: any) => r.result_type === 'output')
    
    return NextResponse.json({
      input: inputResult || null,
      output: outputResult || null,
      total: enrichedResults.length
    })
    
  } catch (error) {
    console.error('Error in workflow-results API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow results' },
      { status: 500 }
    )
  }
}
