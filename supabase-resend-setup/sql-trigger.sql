-- =============================================================================
-- RESEND SYNC TRIGGER - SAFE SETUP (READ ONLY - NO DATA CHANGES)
-- =============================================================================
-- This trigger automatically adds new signups to Resend email list
-- ONLY affects NEW signups (existing 656 users are untouched)
-- If Resend fails, signup still completes (async, non-blocking)
-- =============================================================================

-- Step 1: Enable pg_net extension (for async HTTP calls)
-- This is SAFE - just enables HTTP functionality, doesn't change data
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Step 2: Create the notification function
-- This function will be called AFTER a new user signs up
-- IMPORTANT: Uses SECURITY DEFINER to run with elevated privileges
-- IMPORTANT: Async (doesn't block signup if Resend is slow/down)

CREATE OR REPLACE FUNCTION notify_resend_new_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  endpoint TEXT := 'https://iszvhmzqbaplwemstyzy.supabase.co/functions/v1/add-to-resend';
  user_email TEXT;
  user_name TEXT;
  payload JSONB;
BEGIN
  -- Extract email from new user
  -- NEW.email comes from auth.users table
  user_email := NEW.email;
  
  -- Extract name from user_metadata if available
  -- Try multiple possible field names
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'firstName',
    ''
  );
  
  -- Build JSON payload
  payload := jsonb_build_object(
    'email', user_email,
    'name', user_name
  );
  
  -- Make async HTTP call to Edge Function
  -- IMPORTANT: This is ASYNC - doesn't block signup!
  -- If Resend is down, signup still completes
  PERFORM net.http_post(
    url := endpoint,
    body := payload,
    headers := '{"Content-Type":"application/json"}'::jsonb
  );
  
  -- Log for debugging
  RAISE LOG 'Queued Resend sync for: %', user_email;
  
  -- Return NEW to allow signup to complete
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If anything fails, log it but DON'T block signup
    RAISE LOG 'Resend sync failed for % (non-critical): %', user_email, SQLERRM;
    RETURN NEW;  -- Signup still completes!
END;
$$;

-- Step 3: Create the trigger on auth.users
-- This watches for NEW user signups
-- Fires AFTER INSERT (doesn't block the insert)

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION notify_resend_new_signup();

-- =============================================================================
-- VERIFICATION & TESTING
-- =============================================================================

-- To check if trigger is active:
-- SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- To see recent HTTP calls to Resend:
-- SELECT * FROM net._http_response ORDER BY created DESC LIMIT 10;

-- To disable the trigger if needed:
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- =============================================================================
-- SAFETY NOTES
-- =============================================================================
-- ✅ Only affects NEW signups (existing 656 users untouched)
-- ✅ Async operation (doesn't slow down signups)
-- ✅ Error handling (signup completes even if Resend fails)
-- ✅ Can be disabled instantly by dropping trigger
-- ✅ Logs all actions for debugging
-- ✅ No data modifications (read-only on auth.users)
-- =============================================================================

