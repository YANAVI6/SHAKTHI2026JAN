-- ============================================================================
-- FIX: Drop Unused RLS Policies
-- ============================================================================
-- The linter reports "Policy Exists RLS Disabled" for column_configurations
-- and telecaller_targets. This is because RLS is disabled (correctly), but
-- old policies still exist. We need to drop them.
-- ============================================================================

-- Drop policies for column_configurations
DROP POLICY IF EXISTS "Allow anon delete column configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon insert column configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon read column configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon update column configurations" ON column_configurations;

-- Drop policies for telecaller_targets
DROP POLICY IF EXISTS "Allow anon delete telecaller targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon insert telecaller targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon read telecaller targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon update telecaller targets" ON telecaller_targets;

-- Ensure RLS remains disabled (just in case)
ALTER TABLE column_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecaller_targets DISABLE ROW LEVEL SECURITY;

-- Verification
SELECT 
  tablename, 
  policyname 
FROM pg_policies 
WHERE tablename IN ('column_configurations', 'telecaller_targets');
