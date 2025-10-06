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
    
    // If no results found, return early with helpful message
    if (!results || results.length === 0) {
      console.log('No workflow_results found for this job')
      return NextResponse.json({
        input: null,
        output: null,
        total: 0,
        allResults: [],
        message: 'No CSV data saved for this workflow run yet'
      })
    }
    
    // Log the first result to see its structure
    console.log('Sample result structure:', JSON.stringify(results[0], null, 2))
    console.log(`Attempting to download ${results.length} CSV files from storage...`)
    
    // Fetch CSV content from Supabase Storage
    const enrichedResults = await Promise.all(
      (results || []).map(async (result: any) => {
        try {
          console.log(`Downloading: ${result.storage_bucket}/${result.storage_url}`)
          
          // Download CSV from storage
          const { data: csvData, error: storageError } = await supabaseAdmin
            .storage
            .from(result.storage_bucket)
            .download(result.storage_url)
          
          if (storageError) {
            console.error('Storage download error:', storageError)
            console.error('Failed file:', result.storage_bucket, result.storage_url)
            return { ...result, csvData: null, error: 'Storage access denied or file not found', storageError: storageError.message }
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
    console.log('Enriched results:', enrichedResults.map((r: any) => ({ 
      id: r.id, 
      block_number: r.block_number,
      storage_url: r.storage_url,
      has_headers: !!r.headers,
      has_error: !!r.error
    })))
    
    // Check if any results had errors
    const errorResults = enrichedResults.filter((r: any) => r.error)
    if (errorResults.length > 0) {
      console.error(`${errorResults.length} files failed to download`)
      console.error('First error:', errorResults[0].storageError)
    }
    
    // Filter out results that failed to download
    const successfulResults = enrichedResults.filter((r: any) => r.headers && !r.error)
    
    if (successfulResults.length === 0 && enrichedResults.length > 0) {
      // Results exist in DB but all storage downloads failed
      return NextResponse.json({
        input: null,
        output: null,
        total: 0,
        allResults: [],
        message: 'CSV files exist but could not be accessed from storage. This may be a permissions issue.',
        error: errorResults[0]?.storageError || 'Storage access failed'
      })
    }
    
    // Find first and last results (typically input is first, output is last)
    const inputResult = successfulResults[0] || null
    const outputResult = successfulResults[successfulResults.length - 1] || null
    
    return NextResponse.json({
      input: inputResult,
      output: outputResult,
      total: successfulResults.length,
      allResults: successfulResults,
      ...(errorResults.length > 0 ? { partialError: `${errorResults.length} files could not be accessed` } : {})
    })
    
  } catch (error) {
    console.error('Error in workflow-results API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow results' },
      { status: 500 }
    )
  }
}
