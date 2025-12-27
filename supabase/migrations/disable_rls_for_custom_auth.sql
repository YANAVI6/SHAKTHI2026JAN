-- ============================================================================
-- PERMANENT SOLUTION: Disable RLS for Custom Auth
-- ============================================================================
-- Since you're using custom authentication (not Supabase Auth),
-- we cannot use RLS with auth.uid(). Instead, we'll rely on
-- application-level tenant filtering.
-- ============================================================================

-- Disable RLS on all tenant-specific tables
ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_telecallers DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecaller_targets DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE column_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE viewed_case_logs DISABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'office_settings') THEN
    EXECUTE 'ALTER TABLE office_settings DISABLE ROW LEVEL SECURITY';
  END IF;
END $$;

-- Keep RLS enabled for admin-only tables
-- (tenants, super_admins, etc. should still be protected)

-- Drop the context functions we created (CASCADE will drop dependent policies)
DROP FUNCTION IF EXISTS set_tenant_context(text) CASCADE;
DROP FUNCTION IF EXISTS set_user_context(text) CASCADE;
DROP FUNCTION IF EXISTS clear_session_context() CASCADE;
DROP FUNCTION IF EXISTS get_current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS is_super_admin() CASCADE;
DROP FUNCTION IF EXISTS can_access_tenant(uuid) CASCADE;

-- Keep audit logging function (still useful)
-- DROP FUNCTION IF EXISTS log_security_event(...); -- Keep this

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'RLS disabled successfully!' as status;

SELECT 
  tablename,
  CASE WHEN rowsecurity THEN 'ENABLED' ELSE 'DISABLED' END as rls_status
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'employees', 'customer_cases', 'case_call_logs', 'teams',
    'team_telecallers', 'telecaller_targets', 'notifications',
    'user_activity', 'column_configurations', 'case_views', 'viewed_case_logs'
  )
ORDER BY tablename;
