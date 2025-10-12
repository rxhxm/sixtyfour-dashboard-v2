-- ============================================
-- ADD ROW LEVEL SECURITY TO dashboard_internal_access
-- RUN THIS IN SUPABASE SQL EDITOR IMMEDIATELY!
-- ============================================

-- Enable RLS on the table
ALTER TABLE dashboard_internal_access ENABLE ROW LEVEL SECURITY;

-- Policy 1: Only service role can read (for server-side checks)
CREATE POLICY "Service role can read dashboard_internal_access"
ON dashboard_internal_access
FOR SELECT
TO service_role
USING (true);

-- Policy 2: Only service role can insert/update (for admin operations)
CREATE POLICY "Service role can modify dashboard_internal_access"
ON dashboard_internal_access
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy 3: Authenticated users can ONLY read their own record
CREATE POLICY "Users can read own dashboard access"
ON dashboard_internal_access
FOR SELECT
TO authenticated
USING (auth.email() = email);

-- Verify policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'dashboard_internal_access';

