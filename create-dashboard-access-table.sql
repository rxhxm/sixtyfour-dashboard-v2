-- ============================================
-- DASHBOARD INTERNAL ACCESS TABLE
-- Purpose: Control who can access the dashboard
-- SAFE: Only creates ONE new table, doesn't modify anything else
-- ============================================

-- Create the access control table
CREATE TABLE IF NOT EXISTS dashboard_internal_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT valid_role CHECK (role IN ('admin', 'viewer'))
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_dashboard_access_email ON dashboard_internal_access(email);

-- Add the 3 team members (will be linked to Supabase Auth users)
INSERT INTO dashboard_internal_access (email, full_name, role) 
VALUES 
  ('saarth@sixtyfour.ai', 'Saarth', 'admin'),
  ('roham@sixtyfour.ai', 'Roham', 'admin'),
  ('chrisprice@sixtyfour.ai', 'Chris Price', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Display result
SELECT 
  email, 
  full_name, 
  role, 
  created_at 
FROM dashboard_internal_access 
ORDER BY email;

