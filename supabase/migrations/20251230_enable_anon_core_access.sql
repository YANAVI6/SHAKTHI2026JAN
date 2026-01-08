-- FIX: Enable Anonymous Access for Core Management Tables
-- Required because the application uses Custom Auth (effectively 'anon' role in Supabase)
-- This fixes "Employee Management not showing any employee"

-- ============================================================================
-- 1. EMPLOYEES
-- ============================================================================
-- Allow anon to see/manage employees (Application layer handles validation)
CREATE POLICY "Allow anon select employees" ON employees
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert employees" ON employees
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update employees" ON employees
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete employees" ON employees
  FOR DELETE TO anon
  USING (true);

-- ============================================================================
-- 2. TEAMS
-- ============================================================================
CREATE POLICY "Allow anon select teams" ON teams
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert teams" ON teams
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update teams" ON teams
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete teams" ON teams
  FOR DELETE TO anon
  USING (true);

-- ============================================================================
-- 3. TENANTS (Read-only for most, but needed for context)
-- ============================================================================
CREATE POLICY "Allow anon select tenants" ON tenants
  FOR SELECT TO anon
  USING (true);

-- ============================================================================
-- 4. USER ACTIVITY (Tracking online status)
-- ============================================================================
CREATE POLICY "Allow anon select user_activity" ON user_activity
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert user_activity" ON user_activity
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update user_activity" ON user_activity
  FOR UPDATE TO anon
  USING (true);
