-- COMPREHENSIVE FIX: Activity Tracker & Telecaller Logout
-- This script force-enables permissions for ALL roles (via anon) to update user_activity.

BEGIN;

-- 1. Ensure Realtime Publication (Idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already exists, ignore
END $$;

-- 2. Force Replica Identity (Critical for correctly receiving updates)
ALTER TABLE public.user_activity REPLICA IDENTITY FULL;

-- 3. Reset RLS Policies for user_activity
-- We drop existing policies to ensure no conflicts or restrictive legacy policies remain.
DROP POLICY IF EXISTS "Allow anon select user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon insert user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon update user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon delete user_activity" ON user_activity;

-- 4. Create Permissive Policies (Since Authentication is Custom/Anon)
-- Allow unlimited SELECT (Viewing tracker)
CREATE POLICY "Allow anon select user_activity" ON user_activity
  FOR SELECT TO anon
  USING (true);

-- Allow unlimited INSERT (Logging in)
CREATE POLICY "Allow anon insert user_activity" ON user_activity
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow unlimited UPDATE (Logging out, Status change)
-- We use USING(true) to allow finding the row, and WITH CHECK(true) to allow any update.
CREATE POLICY "Allow anon update user_activity" ON user_activity
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Allow unlimited DELETE (Cleanup if needed)
CREATE POLICY "Allow anon delete user_activity" ON user_activity
  FOR DELETE TO anon
  USING (true);

-- 5. Explicitly Grant Permissions to 'anon' and 'authenticated' roles
-- This ensures that even if RLS is off (it shouldn't be), basic DB permissions exist.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_activity TO service_role;

-- 6. Verify 'employees' table access (Just in case lookup fails during login/logout)
-- (Already handled by previous script, but good to ensure)
GRANT SELECT ON public.employees TO anon;

COMMIT;
