import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { ParquetReader } from '@dsnp/parquetjs'

export const runtime = 'nodejs'
export const maxDuration = 60

// Helper to convert BigInt values to strings for JSON serialization
function serializeRow(row: any): any {
  const result: any = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === 'bigint') {
      result[key] = value.toString()
    } else if (value instanceof Date) {
      result[key] = value.toISOString()
    } else if (Buffer.isBuffer(value)) {
      result[key] = value.toString('utf-8')
    } else if (typeof value === 'object' && value !== null) {
      result[key] = serializeRow(value)
    } else {
      result[key] = value
    }
  }
  return result
}

// Parse Parquet buffer to rows
async function parseParquet(buffer: Buffer): Promise<{ headers: string[], rows: any[] }> {
  try {
    const reader = await ParquetReader.openBuffer(buffer)
    
    // Get schema to extract column names
    const schema = reader.getSchema()
    const headers = Object.keys(schema.fields || schema)
    
    // Read all rows
    const cursor = reader.getCursor()
    const rows: any[] = []
    let record = null
    
    while (record = await cursor.next()) {
      rows.push(serializeRow(record))
    }
    
    await reader.close()
    
    return { headers, rows }
  } catch (error: any) {
    console.error('Parquet parsing error:', error?.message || error)
    throw error
  }
}

// Parse CSV text to rows
function parseCsv(text: string): { headers: string[], rows: any[] } {
  const lines = text.split('\n').filter((line: string) => line.trim())
  const headers = lines[0]?.split(',').map(h => h.trim().replace(/^"|"$/g, '')) || []
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
        values.push(current.trim().replace(/^"|"$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    values.push(current.trim().replace(/^"|"$/g, ''))
    
    return headers.reduce((obj: any, header: string, idx: number) => {
      obj[header] = values[idx] || ''
      return obj
    }, {})
  })
  
  return { headers, rows }
}

// Convert rows to CSV text for download
function rowsToCsv(headers: string[], rows: any[]): string {
  const headerLine = headers.map(h => `"${h}"`).join(',')
  const dataLines = rows.map(row => 
    headers.map(h => {
      const val = row[h] ?? ''
      const strVal = String(val)
      // Quote all values for safety
      return `"${strVal.replace(/"/g, '""')}"`
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
    
    if (!results || results.length === 0) {
      return NextResponse.json({
        input: null,
        output: null,
        total: 0,
        allResults: [],
        message: 'No data saved for this workflow run yet'
      })
    }
    
    // Fetch file content from Supabase Storage
    const enrichedResults = await Promise.all(
      (results || []).map(async (result: any) => {
        try {
          console.log(`Downloading: ${result.storage_bucket}/${result.storage_url}`)
          
          const { data: fileData, error: storageError } = await supabaseAdmin
            .storage
            .from(result.storage_bucket)
            .download(result.storage_url)
          
          if (storageError) {
            console.error('Storage download error:', storageError)
            return { ...result, error: 'File not found', storageError: storageError.message }
          }
          
          const arrayBuffer = await fileData.arrayBuffer()
          const nodeBuffer = Buffer.from(arrayBuffer)
          const uint8Array = new Uint8Array(arrayBuffer)
          
          // Check if it's a Parquet file (magic bytes: PAR1)
          const isParquet = uint8Array[0] === 0x50 && 
                           uint8Array[1] === 0x41 && 
                           uint8Array[2] === 0x52 && 
                           uint8Array[3] === 0x31
          
          const isParquetExt = result.storage_url?.toLowerCase().endsWith('.parquet')
          
          let headers: string[] = []
          let rows: any[] = []
          let raw: string = ''
          let format: string = 'csv'
          
          if (isParquet || isParquetExt) {
            console.log(`Parsing Parquet file: ${result.storage_url}`)
            format = 'parquet'
            
            try {
              const parsed = await parseParquet(nodeBuffer)
              headers = parsed.headers
              rows = parsed.rows
              raw = rowsToCsv(headers, rows)
              console.log(`Parquet parsed: ${headers.length} columns, ${rows.length} rows`)
            } catch (parseError: any) {
              console.error('Parquet parse error:', parseError?.message)
              return { 
                ...result, 
                error: `Parquet parse failed: ${parseError?.message || 'Unknown error'}`,
                format: 'parquet'
              }
            }
          } else {
            format = 'csv'
            const text = new TextDecoder().decode(uint8Array)
            
            // Check if it looks like binary data
            const firstLine = text.split('\n')[0] || ''
            const hasBinaryGarbage = /[\x00-\x08\x0E-\x1F]/.test(firstLine.slice(0, 100))
            
            if (hasBinaryGarbage) {
              // Try parsing as Parquet anyway
              console.log('File appears binary, attempting Parquet parse...')
              try {
                const parsed = await parseParquet(nodeBuffer)
                headers = parsed.headers
                rows = parsed.rows
                raw = rowsToCsv(headers, rows)
                format = 'parquet'
              } catch {
                return { 
                  ...result, 
                  error: 'Unknown binary format',
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
            preview: rows.slice(0, 100),
            row_count: rows.length,
            totalRows: rows.length,
            raw,
            format
          }
        } catch (e: any) {
          console.error('Error processing result:', e?.message)
          return { ...result, error: `Processing failed: ${e?.message}` }
        }
      })
    )
    
    const errorResults = enrichedResults.filter((r: any) => r.error)
    const successfulResults = enrichedResults.filter((r: any) => r.headers && !r.error)
    
    console.log(`Processed: ${successfulResults.length} success, ${errorResults.length} errors`)
    
    if (successfulResults.length === 0 && enrichedResults.length > 0) {
      return NextResponse.json({
        input: null,
        output: null,
        total: 0,
        allResults: [],
        message: 'Files exist but could not be processed.',
        error: errorResults[0]?.error || 'Processing failed'
      })
    }
    
    const inputResult = successfulResults[0] || null
    const outputResult = successfulResults[successfulResults.length - 1] || null
    
    return NextResponse.json({
      input: inputResult,
      output: outputResult,
      total: successfulResults.length,
      allResults: successfulResults,
      ...(errorResults.length > 0 ? { partialError: `${errorResults.length} files failed` } : {})
    })
    
  } catch (error: any) {
    console.error('Error in workflow-results API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow results' },
      { status: 500 }
    )
  }
}
