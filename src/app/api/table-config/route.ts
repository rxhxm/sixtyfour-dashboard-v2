import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tableName = searchParams.get('table') || 'your_table_name_here'
  
  try {
    console.log(`Testing specific table: ${tableName}`)
    
    // Test the specified table
    const { data: tableData, error: tableError } = await supabaseAdmin
      .from(tableName)
      .select('*')
      .limit(5)
    
    console.log('Table query result:', { tableData, tableError })
    
    // Also get some sample API usage data to compare
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('api_usage')
      .select('api_key')
      .limit(5)
    
    return NextResponse.json({
      tableName,
      tableData: {
        data: tableData,
        error: tableError,
        count: tableData?.length || 0,
        columns: tableData && tableData.length > 0 ? Object.keys(tableData[0]) : []
      },
      usageData: {
        data: usageData,
        error: usageError,
        sampleKeys: usageData?.map(u => u.api_key.substring(0, 8)) || []
      },
      instructions: "Use ?table=YOUR_TABLE_NAME to test your specific table"
    })
  } catch (error) {
    console.error('Test table error:', error)
    return NextResponse.json({ 
      error: 'Failed to test table', 
      tableName,
      details: error 
    }, { status: 500 })
  }
} 