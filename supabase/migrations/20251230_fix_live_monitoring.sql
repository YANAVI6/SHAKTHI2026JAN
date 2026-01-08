-- FIX: Enable anon access to case_call_logs for Live Monitoring
-- The Live Monitoring component needs to read call logs to show telecaller activity.

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.case_call_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anon select case_call_logs" ON case_call_logs;
DROP POLICY IF EXISTS "Allow anon insert case_call_logs" ON case_call_logs;
DROP POLICY IF EXISTS "Allow anon update case_call_logs" ON case_call_logs;

-- Allow anon to SELECT call logs (for Live Monitoring and reporting)
CREATE POLICY "Allow anon select case_call_logs" ON case_call_logs
  FOR SELECT TO anon
  USING (true);

-- Allow anon to INSERT call logs (for telecallers logging calls)
CREATE POLICY "Allow anon insert case_call_logs" ON case_call_logs
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to UPDATE call logs (for editing call records)
CREATE POLICY "Allow anon update case_call_logs" ON case_call_logs
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Grant explicit permissions
GRANT SELECT, INSERT, UPDATE ON public.case_call_logs TO anon;
GRANT SELECT, INSERT, UPDATE ON public.case_call_logs TO authenticated;

COMMIT;
