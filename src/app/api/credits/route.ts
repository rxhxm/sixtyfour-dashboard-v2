import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'

// Server-side only - credentials never exposed to client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY! // Use service key for admin operations

// HARDCODED WHITELIST - ONLY THESE 3 EMAILS CAN MODIFY CREDITS
const AUTHORIZED_EMAILS = [
  'saarth@sixtyfour.ai',
  'roham@sixtyfour.ai',
  'chrisprice@sixtyfour.ai'
]

// CRITICAL: Verify authentication for sensitive operations
async function verifyAuth(): Promise<{ authorized: boolean, email?: string }> {
  try {
    // Use the same server client as main app
    const supabase = await createSupabaseServerClient()
    
    // Get user from session
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      console.log('🚫 No valid user session')
      return { authorized: false }
    }
    
    const email = user.email?.toLowerCase()
    console.log('📧 User email from session:', email)
    
    // Check against whitelist
    if (!email || !AUTHORIZED_EMAILS.includes(email)) {
      console.log('🚨 UNAUTHORIZED ACCESS ATTEMPT:', email || 'unknown')
      return { authorized: false }
    }
    
    console.log('✅ AUTHORIZED:', email)
    return { authorized: true, email }
    
  } catch (error) {
    console.error('🚨 Auth verification error:', error)
    // SECURITY: Fail closed
    return { authorized: false }
  }
}

// GET - Fetch all subscriptions with balances
export async function GET(request: NextRequest) {
  // CRITICAL: Check authentication
  const { authorized, email } = await verifyAuth()
  
  if (!authorized) {
    console.log('🚫 Unauthorized GET request to /api/credits')
    return NextResponse.json(
      { error: 'Unauthorized - Access denied' },
      { status: 401 }
    )
  }
  
  console.log('✅ Authorized GET request from:', email)
  
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Create admin client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Fetch subscriptions ordered by prepaid balance (highest first) with pagination
    const limit = searchParams.get('limit') || '1000'
    const offset = searchParams.get('offset') || '0'
    
    const { data, error, count } = await supabase
      .from('api_subscriptions')
      .select('*', { count: 'exact' })
      .order('balance_prepaid', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1)

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ 
      data: data || [], 
      total: count || 0,
      limit: parseInt(limit),
      offset: parseInt(offset)
    })
  } catch (error) {
    console.error('Error fetching subscriptions:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// POST - Adjust credits (add or remove)
export async function POST(request: NextRequest) {
  // CRITICAL: Check authentication FIRST before any operations
  const { authorized, email } = await verifyAuth()
  
  if (!authorized) {
    console.log('🚨 UNAUTHORIZED ATTEMPT TO MODIFY CREDITS!')
    return NextResponse.json(
      { error: 'Unauthorized - Access denied. This incident will be logged.' },
      { status: 401 }
    )
  }
  
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase credentials not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { org_id, amount, operation } = body
    
    // Log who is making this change for audit trail
    console.log(`💰 Credits ${operation} requested by ${email}:`, { org_id, amount })

    // Validation
    if (!org_id) {
      return NextResponse.json(
        { error: 'org_id is required' },
        { status: 400 }
      )
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { error: 'amount must be a positive number' },
        { status: 400 }
      )
    }

    if (operation !== 'add' && operation !== 'remove') {
      return NextResponse.json(
        { error: 'operation must be "add" or "remove"' },
        { status: 400 }
      )
    }

    // Create admin client with service key
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('api_subscriptions')
      .select('*')
      .eq('org_id', org_id)
      .single()

    if (fetchError || !subscription) {
      return NextResponse.json(
        { error: `Subscription not found for org_id: ${org_id}` },
        { status: 404 }
      )
    }

    const currentBalance = subscription.balance_prepaid || 0
    let newBalance: number

    if (operation === 'add') {
      newBalance = currentBalance + amount
    } else {
      // Remove - ensure balance doesn't go negative
      newBalance = Math.max(0, currentBalance - amount)
    }

    // Update balance
    const { data: updatedData, error: updateError } = await supabase
      .from('api_subscriptions')
      .update({ balance_prepaid: newBalance })
      .eq('org_id', org_id)
      .select()
      .single()

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update balance', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      org_id,
      operation,
      amount,
      previousBalance: currentBalance,
      newBalance,
      subscription: updatedData
    })
  } catch (error) {
    console.error('Error adjusting credits:', error)
    return NextResponse.json(
      { error: 'Internal server error', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

