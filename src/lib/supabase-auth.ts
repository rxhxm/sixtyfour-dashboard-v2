import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client (for components)
export const createSupabaseClient = () => {
  return createClientComponentClient()
}

// Server-side Supabase client (for API routes)
export const createSupabaseServerClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Check if user has dashboard access
export async function checkDashboardAccess(email: string): Promise<boolean> {
  const supabase = createSupabaseServerClient()
  
  try {
    const { data, error } = await supabase
      .from('dashboard_internal_access')
      .select('email, role')
      .eq('email', email.toLowerCase())
      .single()
    
    if (error || !data) {
      console.log('User not found in dashboard_internal_access:', email)
      return false
    }
    
    console.log('✅ User has dashboard access:', email, 'Role:', data.role)
    return true
  } catch (error) {
    console.error('Error checking dashboard access:', error)
    return false
  }
}

// Update last login timestamp
export async function updateLastLogin(email: string): Promise<void> {
  const supabase = createSupabaseServerClient()
  
  try {
    await supabase
      .from('dashboard_internal_access')
      .update({ last_login: new Date().toISOString() })
      .eq('email', email.toLowerCase())
    
    console.log('📝 Updated last login for:', email)
  } catch (error) {
    console.error('Error updating last login:', error)
  }
}

// Get current user session with proper error handling
export async function getCurrentUser() {
  const supabase = createSupabaseClient()
  
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    return session?.user || null
  } catch (error) {
    console.error('Error in getCurrentUser:', error)
    return null
  }
}

// Sign out helper
export async function signOut() {
  const supabase = createSupabaseClient()
  
  try {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error('Error signing out:', error)
      return false
    }
    return true
  } catch (error) {
    console.error('Error in signOut:', error)
    return false
  }
}

