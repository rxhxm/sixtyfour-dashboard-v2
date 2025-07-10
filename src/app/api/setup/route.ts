import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function POST() {
  try {
    // Insert sample organizations
    const { error: orgError } = await supabaseAdmin.from('organizations').upsert([
      { name: 'Demo Organization', slug: 'demo-org' },
      { name: 'Test Company', slug: 'test-company' },
      { name: 'Development Team', slug: 'dev-team' }
    ], { onConflict: 'slug' })

    if (orgError) {
      console.error('Error inserting organizations:', orgError)
      return NextResponse.json({ 
        error: 'Failed to insert organizations. Please create the database tables first through Supabase dashboard.',
        details: orgError.message 
      }, { status: 500 })
    }

    // Get demo org for sample data
    const { data: demoOrg } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', 'demo-org')
      .single()

    if (demoOrg) {
      // Insert sample API usage
      const sampleUsage = []
      for (let i = 0; i < 50; i++) {
        const daysAgo = Math.floor(Math.random() * 30)
        const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
        
        sampleUsage.push({
          api_key: `demo-key-${i}`,
          org_id: demoOrg.id,
          endpoint: '/api/v1/chat/completions',
          method: 'POST',
          status_code: Math.random() > 0.1 ? 200 : 500,
          request_count: 1,
          response_time_ms: Math.floor(100 + Math.random() * 900),
          timestamp: timestamp.toISOString(),
          cost_usd: Math.random() * 0.1,
          tokens_used: Math.floor(50 + Math.random() * 200),
          model_used: 'gpt-4',
          trace_id: `trace-${i}`
        })
      }
      
      const { error: usageError } = await supabaseAdmin.from('api_usage').upsert(sampleUsage)
      if (usageError) {
        console.error('Error inserting sample usage:', usageError)
        return NextResponse.json({ 
          error: 'Failed to insert sample usage data',
          details: usageError.message 
        }, { status: 500 })
      }
    }
    
    return NextResponse.json({ message: 'Database setup completed successfully' })
  } catch (error) {
    console.error('Setup error:', error)
    return NextResponse.json({ error: 'Failed to set up database' }, { status: 500 })
  }
} 