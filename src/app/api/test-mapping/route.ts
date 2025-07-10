import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    console.log('Testing playbook_api_keys table...')
    
    // Test different possible table names
    const tableNames = ['playbook_api_keys', 'api_keys', 'user_api_keys', 'organization_keys', 'keys']
    let mappingData = null
    let mappingError = null
    let foundTable = null
    
    for (const tableName of tableNames) {
      console.log(`Testing table: ${tableName}`)
      const { data, error } = await supabaseAdmin
        .from(tableName)
        .select('*')
        .limit(5)
      
      if (!error) {
        mappingData = data
        mappingError = error
        foundTable = tableName
        console.log(`Found table: ${tableName}`)
        break
      } else {
        console.log(`Table ${tableName} not found:`, error.message)
      }
    }
    
    console.log('Mapping query result:', { mappingData, mappingError })
    
    // Also get some sample API usage data to compare
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('api_usage')
      .select('api_key')
      .limit(5)
    
    console.log('Usage query result:', { usageData, usageError })
    
    return NextResponse.json({
      mappingTable: {
        data: mappingData,
        error: mappingError,
        count: mappingData?.length || 0,
        foundTable: foundTable
      },
      usageTable: {
        data: usageData,
        error: usageError,
        count: usageData?.length || 0
      },
      comparison: {
        message: 'Check if API keys from usage match keys in mapping table',
        sampleUsageKeys: usageData?.map(u => u.api_key) || [],
        sampleMappingKeys: mappingData?.map(m => m.key) || []
      }
    })
  } catch (error) {
    console.error('Test mapping error:', error)
    return NextResponse.json({ error: 'Failed to test mapping', details: error }, { status: 500 })
  }
} 