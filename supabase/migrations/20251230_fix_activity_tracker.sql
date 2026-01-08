-- FIX: Enable Realtime for User Activity Tracker (Idempotent Version)
-- "Activity Tracker not working correctly" often means realtime updates are not flowing.
-- This script explicitly adds 'user_activity' to the realtime publication.

-- 1. Enable Realtime for user_activity (Safe Check)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Already exists, ignore error
  WHEN OTHERS THEN
    NULL; -- Ignore other errors to allow script to proceed
END $$;

-- 2. Set Replica Identity to FULL (CRITICAL STEP)
-- This ensures that UPDATE events contain the full old row data, 
-- which is crucial for the Activity Tracker to correctly calculate transitions 
-- (e.g., knowing the previous 'status' or 'last_active_time').
ALTER TABLE public.user_activity REPLICA IDENTITY FULL;

-- 3. Verify RLS Policies (Just to be double sure)
-- Ensure 'anon' (Custom Auth) can read all activities
DROP POLICY IF EXISTS "Allow anon select user_activity" ON user_activity;
CREATE POLICY "Allow anon select user_activity" ON user_activity
  FOR SELECT TO anon
  USING (true);

-- Ensure 'anon' can update (for their own activity tracking)
DROP POLICY IF EXISTS "Allow anon update user_activity" ON user_activity;
CREATE POLICY "Allow anon update user_activity" ON user_activity
  FOR UPDATE TO anon
  USING (true);

DROP POLICY IF EXISTS "Allow anon insert user_activity" ON user_activity;
CREATE POLICY "Allow anon insert user_activity" ON user_activity
  FOR INSERT TO anon
  WITH CHECK (true);
