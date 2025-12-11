import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

// Parse Parquet buffer to rows
async function parseParquet(buffer: ArrayBuffer): Promise<{ headers: string[], rows: any[] }> {
  try {
    // Dynamic import to avoid issues with edge runtime
    const parquet = await import('parquetjs-lite')
    
    // Convert ArrayBuffer to Buffer
    const nodeBuffer = Buffer.from(buffer)
    
    // Create a reader from the buffer
    const reader = await parquet.ParquetReader.openBuffer(nodeBuffer)
    
    // Get schema to extract column names
    const schema = reader.getSchema()
    const headers = Object.keys(schema.fields || schema)
    
    // Read all rows
    const cursor = reader.getCursor()
    const rows: any[] = []
    let record = null
    
    while (record = await cursor.next()) {
      rows.push(record)
    }
    
    await reader.close()
    
    return { headers, rows }
  } catch (error) {
    console.error('Parquet parsing error:', error)
    throw error
  }
}

// Parse CSV text to rows
function parseCsv(text: string): { headers: string[], rows: any[] } {
  const lines = text.split('\n').filter((line: string) => line.trim())
  const headers = lines[0]?.split(',').map(h => h.trim()) || []
  const rows = lines.slice(1).map((line: string) => {
    // Handle quoted CSV values
    const values: string[] = []
    let current = ''
    let inQuotes = false
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim())
    
    return headers.reduce((obj: any, header: string, idx: number) => {
      obj[header] = values[idx] || ''
      return obj
    }, {})
  })
  
  return { headers, rows }
}

// Convert rows to CSV text for download
function rowsToCsv(headers: string[], rows: any[]): string {
  const headerLine = headers.join(',')
  const dataLines = rows.map(row => 
    headers.map(h => {
      const val = row[h] ?? ''
      // Quote values that contain commas or quotes
      if (typeof val === 'string' && (val.includes(',') || val.includes('"'))) {
        return `"${val.replace(/"/g, '""')}"`
      }
      return val
    }).join(',')
  )
  return [headerLine, ...dataLines].join('\n')
}

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
    console.log(`Attempting to download ${results.length} files from storage...`)
    
    // Fetch file content from Supabase Storage
    const enrichedResults = await Promise.all(
      (results || []).map(async (result: any) => {
        try {
          console.log(`Downloading: ${result.storage_bucket}/${result.storage_url}`)
          
          // Download file from storage
          const { data: fileData, error: storageError } = await supabaseAdmin
            .storage
            .from(result.storage_bucket)
            .download(result.storage_url)
          
          if (storageError) {
            console.error('Storage download error:', storageError)
            console.error('Failed file:', result.storage_bucket, result.storage_url)
            return { ...result, csvData: null, error: 'Storage access denied or file not found', storageError: storageError.message }
          }
          
          // Get the file as ArrayBuffer to check format
          const arrayBuffer = await fileData.arrayBuffer()
          const uint8Array = new Uint8Array(arrayBuffer)
          
          // Check if it's a Parquet file (magic bytes: PAR1)
          const isParquet = uint8Array[0] === 0x50 && // P
                           uint8Array[1] === 0x41 && // A
                           uint8Array[2] === 0x52 && // R
                           uint8Array[3] === 0x31    // 1
          
          // Also check file extension as backup
          const isParquetExt = result.storage_url?.toLowerCase().endsWith('.parquet')
          
          let headers: string[] = []
          let rows: any[] = []
          let raw: string = ''
          let format: string = 'csv'
          
          if (isParquet || isParquetExt) {
            console.log(`File is Parquet format: ${result.storage_url}`)
            format = 'parquet'
            
            try {
              const parsed = await parseParquet(arrayBuffer)
              headers = parsed.headers
              rows = parsed.rows
              // Convert to CSV for download compatibility
              raw = rowsToCsv(headers, rows)
            } catch (parseError) {
              console.error('Parquet parse error:', parseError)
              return { 
                ...result, 
                error: 'Failed to parse Parquet file',
                format: 'parquet'
              }
            }
          } else {
            // Assume CSV
            format = 'csv'
            const text = new TextDecoder().decode(uint8Array)
            
            // Check if it looks like valid CSV (not binary garbage)
            const firstLine = text.split('\n')[0] || ''
            const hasBinaryGarbage = firstLine.includes('\0') || 
                                     firstLine.includes('PAR1') ||
                                     /[\x00-\x08\x0E-\x1F]/.test(firstLine)
            
            if (hasBinaryGarbage) {
              console.log('File appears to be binary, attempting Parquet parse...')
              try {
                const parsed = await parseParquet(arrayBuffer)
                headers = parsed.headers
                rows = parsed.rows
                raw = rowsToCsv(headers, rows)
                format = 'parquet'
              } catch (parseError) {
                console.error('Binary file is not valid Parquet:', parseError)
                return { 
                  ...result, 
                  error: 'File format not recognized (not CSV or Parquet)',
                  format: 'unknown'
                }
              }
            } else {
              const parsed = parseCsv(text)
              headers = parsed.headers
              rows = parsed.rows
              raw = text
            }
          }
          
          return {
            ...result,
            headers,
            preview: rows.slice(0, 100), // First 100 rows for preview
            row_count: rows.length,
            totalRows: rows.length,
            raw, // CSV format for download
            format
          }
        } catch (e) {
          console.error('Error processing result:', e)
          return { ...result, csvData: null, error: 'Failed to process file' }
        }
      })
    )
    
    // Separate input and output results
    console.log('Enriched results:', enrichedResults.map((r: any) => ({ 
      id: r.id, 
      block_number: r.block_number,
      storage_url: r.storage_url,
      has_headers: !!r.headers,
      has_error: !!r.error,
      format: r.format,
      row_count: r.row_count
    })))
    
    // Check if any results had errors
    const errorResults = enrichedResults.filter((r: any) => r.error)
    if (errorResults.length > 0) {
      console.error(`${errorResults.length} files failed to process`)
      console.error('First error:', errorResults[0].error)
    }
    
    // Filter out results that failed to download
    const successfulResults = enrichedResults.filter((r: any) => r.headers && !r.error)
    
    if (successfulResults.length === 0 && enrichedResults.length > 0) {
      // Results exist in DB but all processing failed
      return NextResponse.json({
        input: null,
        output: null,
        total: 0,
        allResults: [],
        message: 'Files exist but could not be processed. Format may not be supported.',
        error: errorResults[0]?.error || 'Processing failed'
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
      ...(errorResults.length > 0 ? { partialError: `${errorResults.length} files could not be processed` } : {})
    })
    
  } catch (error) {
    console.error('Error in workflow-results API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow results' },
      { status: 500 }
    )
  }
}
