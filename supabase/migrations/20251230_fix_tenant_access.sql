-- FIX: Enable Full Access for Tenants table for Anon role
-- Required for Super Admin dashboard to manage tenants using the anon client

-- Drop existing restricted policy if it exists (to avoid conflicts)
DROP POLICY IF EXISTS "Allow anon select tenants" ON tenants;

-- ============================================================================
-- TENANTS - Full Access for Anon (Application handles SuperAdmin checks)
-- ============================================================================
CREATE POLICY "Allow anon select tenants" ON tenants
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert tenants" ON tenants
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update tenants" ON tenants
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete tenants" ON tenants
  FOR DELETE TO anon
  USING (true);
