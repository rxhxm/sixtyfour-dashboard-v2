import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { INTEREST_FORM_DATA } from '@/data/interest-form-data'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 })
    }
    
    // 1. Fetch ALL Auth Users
    let allUsers: any[] = []
    let page = 1
    
    while (page <= 5) { // Cap at 5000 users for performance
      const { data } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 })
      if (!data.users || data.users.length === 0) break
      allUsers = [...allUsers, ...data.users]
      if (data.users.length < 1000) break
      page++
    }
    
    // 2. Prepare Interest Form Data Map
    const interestMap = new Map()
    INTEREST_FORM_DATA.forEach((entry: any) => {
      if (entry.email) {
        interestMap.set(entry.email.toLowerCase(), entry)
      }
    })
    
    // 3. Merge & Analyze
    const dailyStats: Record<string, { signups: number, interestForms: number }> = {}
    
    // Process Auth Users (Real Signups)
    allUsers.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0]
      if (!dailyStats[date]) dailyStats[date] = { signups: 0, interestForms: 0 }
      dailyStats[date].signups++
    })
    
    // Process Interest Forms
    INTEREST_FORM_DATA.forEach((entry: any) => {
      if (entry.submitted_at) {
        const date = new Date(entry.submitted_at).toISOString().split('T')[0]
        if (!dailyStats[date]) dailyStats[date] = { signups: 0, interestForms: 0 }
        dailyStats[date].interestForms++
      }
    })
    
    // Convert to array and sort
    const chartData = Object.entries(dailyStats)
      .map(([date, stats]) => ({
        date,
        signups: stats.signups,
        interestForms: stats.interestForms,
        total: stats.signups + stats.interestForms
      }))
      .sort((a, b) => a.date.localeCompare(b.date))
      
    // Calculate Overlap
    let overlapCount = 0
    allUsers.forEach(user => {
      if (user.email && interestMap.has(user.email.toLowerCase())) {
        overlapCount++
      }
    })
    
    // Recent Signups with Enrichment
    const recentSignups = allUsers
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 50)
      .map(user => {
        const interestData = interestMap.get(user.email?.toLowerCase())
        return {
          email: user.email,
          created_at: user.created_at,
          provider: user.app_metadata?.provider || 'email',
          name: interestData?.name || null,
          company: interestData?.company || null,
          heard_about: interestData?.heard_about_us || null,
          from_interest_form: !!interestData
        }
      })

    return NextResponse.json({
      summary: {
        totalSignups: allUsers.length,
        totalInterestForms: INTEREST_FORM_DATA.length,
        overlap: overlapCount,
        conversionRate: ((overlapCount / INTEREST_FORM_DATA.length) * 100).toFixed(1)
      },
      chartData,
      recentSignups
    })
    
  } catch (error) {
    console.error('Error in signup analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

