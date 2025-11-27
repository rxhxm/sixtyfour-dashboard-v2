import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Initialize Supabase admin client lazily
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    console.log('📊 Marketing Metrics API called:', { startDate, endDate });

    // Get Supabase admin client
    const supabaseAdmin = getSupabaseAdmin();

    // Fetch all auth users
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 10000 // Get all users
    });

    if (authError) {
      console.error('Error fetching auth users:', authError);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    const allUsers = authData.users;
    console.log(`✅ Fetched ${allUsers.length} total users from auth.users`);

    // Filter users by date range if provided
    let filteredUsers = allUsers;
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      filteredUsers = allUsers.filter(user => {
        const createdAt = new Date(user.created_at);
        return createdAt >= start && createdAt <= end;
      });
    }

    // Group users by day for daily signups chart
    const signupsByDay: Record<string, number> = {};
    filteredUsers.forEach(user => {
      const date = new Date(user.created_at).toISOString().split('T')[0];
      signupsByDay[date] = (signupsByDay[date] || 0) + 1;
    });

    // Sort by date
    const dailySignups = Object.entries(signupsByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, signups]) => ({
        date,
        signups
      }));

    // Calculate growth rate (comparing to previous period)
    const periodDays = dailySignups.length;
    const totalSignups = filteredUsers.length;
    const avgSignupsPerDay = periodDays > 0 ? totalSignups / periodDays : 0;

    // Fetch API usage data from the database for these users
    const userIds = filteredUsers.map(u => u.id);
    
    // Query API usage table
    const { data: usageData, error: usageError } = await supabaseAdmin
      .from('api_usage')
      .select('user_id, cost_usd, tokens_used, created_at')
      .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']) // Fallback to impossible ID if no users
      .order('created_at', { ascending: true });

    if (usageError && usageError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching usage data:', usageError);
    }

    // Calculate usage metrics per user
    const usageByUser: Record<string, { cost: number; tokens: number; requests: number }> = {};
    (usageData || []).forEach(usage => {
      if (!usage.user_id) return;
      
      if (!usageByUser[usage.user_id]) {
        usageByUser[usage.user_id] = { cost: 0, tokens: 0, requests: 0 };
      }
      
      usageByUser[usage.user_id].cost += Number(usage.cost_usd || 0);
      usageByUser[usage.user_id].tokens += Number(usage.tokens_used || 0);
      usageByUser[usage.user_id].requests += 1;
    });

    // Calculate total usage
    let totalCost = 0;
    let totalTokens = 0;
    let totalRequests = 0;
    let activeUsers = 0;

    Object.values(usageByUser).forEach(usage => {
      totalCost += usage.cost;
      totalTokens += usage.tokens;
      totalRequests += usage.requests;
      if (usage.requests > 0) activeUsers++;
    });

    // Group usage by day
    const usageByDay: Record<string, { cost: number; tokens: number; requests: number }> = {};
    (usageData || []).forEach(usage => {
      const date = new Date(usage.created_at).toISOString().split('T')[0];
      if (!usageByDay[date]) {
        usageByDay[date] = { cost: 0, tokens: 0, requests: 0 };
      }
      usageByDay[date].cost += Number(usage.cost_usd || 0);
      usageByDay[date].tokens += Number(usage.tokens_used || 0);
      usageByDay[date].requests += 1;
    });

    const dailyUsage = Object.entries(usageByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, usage]) => ({
        date,
        cost: usage.cost,
        tokens: usage.tokens,
        requests: usage.requests
      }));

    // Top users by usage
    const topUsers = Object.entries(usageByUser)
      .map(([userId, usage]) => {
        const user = allUsers.find(u => u.id === userId);
        return {
          userId,
          email: user?.email || 'Unknown',
          createdAt: user?.created_at || '',
          cost: usage.cost,
          tokens: usage.tokens,
          requests: usage.requests
        };
      })
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 20); // Top 20 users

    const response = {
      summary: {
        totalUsers: allUsers.length,
        newUsersInPeriod: totalSignups,
        activeUsers,
        avgSignupsPerDay: Math.round(avgSignupsPerDay * 10) / 10,
        totalCost,
        totalTokens,
        totalRequests,
        avgCostPerUser: activeUsers > 0 ? totalCost / activeUsers : 0,
        avgRequestsPerUser: activeUsers > 0 ? totalRequests / activeUsers : 0
      },
      dailySignups,
      dailyUsage,
      topUsers,
      period: {
        startDate,
        endDate
      }
    };

    console.log('✅ Marketing metrics calculated:', {
      totalUsers: response.summary.totalUsers,
      newUsers: response.summary.newUsersInPeriod,
      activeUsers: response.summary.activeUsers,
      dailySignupDays: dailySignups.length
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Marketing metrics error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch marketing metrics', details: String(error) },
      { status: 500 }
    );
  }
}

