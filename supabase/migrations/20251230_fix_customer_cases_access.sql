-- FIX: Enable anon access to customer_cases for Live Monitoring
-- The Live Monitoring component needs to read customer cases to show case details.

BEGIN;

-- Ensure RLS is enabled
ALTER TABLE public.customer_cases ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anon select customer_cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon insert customer_cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon update customer_cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon delete customer_cases" ON customer_cases;

-- Allow anon to SELECT customer cases (for Live Monitoring, dashboards, reports)
CREATE POLICY "Allow anon select customer_cases" ON customer_cases
  FOR SELECT TO anon
  USING (true);

-- Allow anon to INSERT customer cases (for uploading cases)
CREATE POLICY "Allow anon insert customer_cases" ON customer_cases
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow anon to UPDATE customer cases (for editing case details, status updates)
CREATE POLICY "Allow anon update customer_cases" ON customer_cases
  FOR UPDATE TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anon to DELETE customer cases (for case management)
CREATE POLICY "Allow anon delete customer_cases" ON customer_cases
  FOR DELETE TO anon
  USING (true);

-- Grant explicit permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_cases TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_cases TO authenticated;

COMMIT;
