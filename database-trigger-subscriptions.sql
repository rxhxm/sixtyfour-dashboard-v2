-- =============================================================================
-- AUTO-CREATE API_SUBSCRIPTIONS TRIGGER
-- =============================================================================
-- This trigger automatically creates api_subscriptions record when new org created
-- Ensures all orgs are visible in Credits Management
-- =============================================================================

-- Function to create subscription for new org
CREATE OR REPLACE FUNCTION create_subscription_for_new_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Create api_subscriptions record with $0 balance
  INSERT INTO api_subscriptions (org_id, balance_prepaid)
  VALUES (NEW."org-id", 0)
  ON CONFLICT (org_id) DO NOTHING;  -- Skip if already exists
  
  -- Log for debugging
  RAISE LOG 'Created api_subscriptions for org: %', NEW."org-id";
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If creation fails, log but don't block org creation
    RAISE LOG 'Failed to create subscription for % (non-critical): %', NEW."org-id", SQLERRM;
    RETURN NEW;  -- Org creation still succeeds
END;
$$;

-- Create trigger on organizations table
DROP TRIGGER IF EXISTS on_organization_created ON organizations;

CREATE TRIGGER on_organization_created
  AFTER INSERT ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION create_subscription_for_new_org();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

-- To verify trigger is active:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_organization_created';

-- To test (creates test org + subscription):
-- INSERT INTO organizations ("org-id") VALUES ('test-trigger-verification');
-- SELECT * FROM api_subscriptions WHERE org_id = 'test-trigger-verification';
-- DELETE FROM organizations WHERE "org-id" = 'test-trigger-verification';

-- =============================================================================
-- SAFETY NOTES
-- =============================================================================
-- ✅ Only affects NEW org creations
-- ✅ Non-blocking (org creation succeeds even if subscription fails)
-- ✅ Logged for debugging
-- ✅ ON CONFLICT prevents duplicates
-- ✅ Can be disabled by dropping trigger
-- =============================================================================

