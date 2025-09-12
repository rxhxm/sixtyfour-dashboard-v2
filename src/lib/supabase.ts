import { createClient } from '@supabase/supabase-js'

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || ''

// Only create clients if credentials are provided
const isSupabaseConfigured = supabaseUrl && supabaseUrl !== 'your-supabase-url-here' && 
                             supabaseAnonKey && supabaseAnonKey !== 'your-supabase-anon-key-here'

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null as any

// Admin client for server-side operations
export const supabaseAdmin = isSupabaseConfigured && supabaseServiceKey && supabaseServiceKey !== 'your-supabase-service-key-here'
  ? createClient(
      supabaseUrl,
      supabaseServiceKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
  : null as any 