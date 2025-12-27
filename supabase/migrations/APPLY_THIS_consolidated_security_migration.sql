-- ============================================================================
-- CORRECTED: Multi-Tenant Security Migration
-- ============================================================================
-- This fixes junction tables that don't have direct tenant_id columns
-- ============================================================================

-- ============================================================================
-- PHASE 1: Tenant Context Functions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN (current_setting('app.current_tenant_id', true))::uuid;
EXCEPTION
  WHEN OTHERS THEN RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := (current_setting('app.current_user_id', true))::uuid;
  IF current_user_id IS NULL THEN RETURN false; END IF;
  RETURN EXISTS (SELECT 1 FROM super_admins WHERE id = current_user_id AND status = 'active');
EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION can_access_tenant(check_tenant_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
AS $$
BEGIN
  IF is_super_admin() THEN RETURN true; END IF;
  RETURN get_current_tenant_id() = check_tenant_id;
EXCEPTION
  WHEN OTHERS THEN RETURN false;
END;
$$;

-- ============================================================================
-- PHASE 2: Secure Tables with Direct tenant_id
-- ============================================================================

-- customer_cases
DROP POLICY IF EXISTS "Allow anon read customer cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon insert customer cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon update customer cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon delete customer cases" ON customer_cases;

CREATE POLICY "Tenant isolation - SELECT customer_cases" ON customer_cases FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT customer_cases" ON customer_cases FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE customer_cases" ON customer_cases FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE customer_cases" ON customer_cases FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- employees
DROP POLICY IF EXISTS "Allow anon to read employees" ON employees;
DROP POLICY IF EXISTS "Allow anon to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow anon to update employees" ON employees;
DROP POLICY IF EXISTS "Allow anon to delete employees" ON employees;

CREATE POLICY "Tenant isolation - SELECT employees" ON employees FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT employees" ON employees FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE employees" ON employees FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE employees" ON employees FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- case_call_logs
DROP POLICY IF EXISTS "Allow anon read call logs" ON case_call_logs;
DROP POLICY IF EXISTS "Allow anon insert call logs" ON case_call_logs;
DROP POLICY IF EXISTS "Allow anon update call logs" ON case_call_logs;

CREATE POLICY "Tenant isolation - SELECT case_call_logs" ON case_call_logs FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT case_call_logs" ON case_call_logs FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE case_call_logs" ON case_call_logs FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE case_call_logs" ON case_call_logs FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- teams
DROP POLICY IF EXISTS "Allow anon read teams" ON teams;
DROP POLICY IF EXISTS "Allow anon insert teams" ON teams;
DROP POLICY IF EXISTS "Allow anon update teams" ON teams;
DROP POLICY IF EXISTS "Allow anon delete teams" ON teams;

CREATE POLICY "Tenant isolation - SELECT teams" ON teams FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT teams" ON teams FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE teams" ON teams FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE teams" ON teams FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- telecaller_targets (gets tenant through employees)
DROP POLICY IF EXISTS "Allow anon read telecaller_targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon insert telecaller_targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon update telecaller_targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon delete telecaller_targets" ON telecaller_targets;

CREATE POLICY "Tenant isolation - SELECT telecaller_targets" ON telecaller_targets FOR SELECT TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM employees WHERE employees.id = telecaller_targets.telecaller_id 
    AND employees.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - INSERT telecaller_targets" ON telecaller_targets FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM employees WHERE employees.id = telecaller_targets.telecaller_id 
    AND employees.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - UPDATE telecaller_targets" ON telecaller_targets FOR UPDATE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM employees WHERE employees.id = telecaller_targets.telecaller_id 
    AND employees.tenant_id = get_current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM employees WHERE employees.id = telecaller_targets.telecaller_id 
    AND employees.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - DELETE telecaller_targets" ON telecaller_targets FOR DELETE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM employees WHERE employees.id = telecaller_targets.telecaller_id 
    AND employees.tenant_id = get_current_tenant_id()
  ));

-- notifications
DROP POLICY IF EXISTS "Allow anon read notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon update notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon delete notifications" ON notifications;

CREATE POLICY "Tenant isolation - SELECT notifications" ON notifications FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT notifications" ON notifications FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE notifications" ON notifications FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE notifications" ON notifications FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- user_activity
DROP POLICY IF EXISTS "Allow anon read user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon insert user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon update user_activity" ON user_activity;

CREATE POLICY "Tenant isolation - SELECT user_activity" ON user_activity FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT user_activity" ON user_activity FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE user_activity" ON user_activity FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE user_activity" ON user_activity FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- column_configurations
DROP POLICY IF EXISTS "Allow anon read column_configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon insert column_configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon update column_configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon delete column_configurations" ON column_configurations;

CREATE POLICY "Tenant isolation - SELECT column_configurations" ON column_configurations FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - INSERT column_configurations" ON column_configurations FOR INSERT TO anon
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - UPDATE column_configurations" ON column_configurations FOR UPDATE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
CREATE POLICY "Tenant isolation - DELETE column_configurations" ON column_configurations FOR DELETE TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());

-- ============================================================================
-- PHASE 3: Junction Tables (Get tenant through foreign keys)
-- ============================================================================

-- team_telecallers (gets tenant through teams)
DROP POLICY IF EXISTS "Allow anon read team_telecallers" ON team_telecallers;
DROP POLICY IF EXISTS "Allow anon insert team_telecallers" ON team_telecallers;
DROP POLICY IF EXISTS "Allow anon update team_telecallers" ON team_telecallers;
DROP POLICY IF EXISTS "Allow anon delete team_telecallers" ON team_telecallers;

CREATE POLICY "Tenant isolation - SELECT team_telecallers" ON team_telecallers FOR SELECT TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_telecallers.team_id 
    AND teams.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - INSERT team_telecallers" ON team_telecallers FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_telecallers.team_id 
    AND teams.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - UPDATE team_telecallers" ON team_telecallers FOR UPDATE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_telecallers.team_id 
    AND teams.tenant_id = get_current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_telecallers.team_id 
    AND teams.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - DELETE team_telecallers" ON team_telecallers FOR DELETE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM teams WHERE teams.id = team_telecallers.team_id 
    AND teams.tenant_id = get_current_tenant_id()
  ));

-- case_views (gets tenant through customer_cases)
DROP POLICY IF EXISTS "Allow anon read access to case views" ON case_views;
DROP POLICY IF EXISTS "Allow anon insert access to case views" ON case_views;
DROP POLICY IF EXISTS "Allow anon update access to case views" ON case_views;
DROP POLICY IF EXISTS "Allow anon delete access to case views" ON case_views;

CREATE POLICY "Tenant isolation - SELECT case_views" ON case_views FOR SELECT TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = case_views.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - INSERT case_views" ON case_views FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = case_views.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - UPDATE case_views" ON case_views FOR UPDATE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = case_views.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = case_views.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - DELETE case_views" ON case_views FOR DELETE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = case_views.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));

-- viewed_case_logs (gets tenant through customer_cases)
DROP POLICY IF EXISTS "Allow anon read viewed case logs" ON viewed_case_logs;
DROP POLICY IF EXISTS "Allow anon insert viewed case logs" ON viewed_case_logs;
DROP POLICY IF EXISTS "Allow anon update viewed case logs" ON viewed_case_logs;
DROP POLICY IF EXISTS "Allow anon delete viewed case logs" ON viewed_case_logs;

CREATE POLICY "Tenant isolation - SELECT viewed_case_logs" ON viewed_case_logs FOR SELECT TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = viewed_case_logs.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - INSERT viewed_case_logs" ON viewed_case_logs FOR INSERT TO anon
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = viewed_case_logs.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - UPDATE viewed_case_logs" ON viewed_case_logs FOR UPDATE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = viewed_case_logs.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = viewed_case_logs.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));
CREATE POLICY "Tenant isolation - DELETE viewed_case_logs" ON viewed_case_logs FOR DELETE TO anon
  USING (is_super_admin() OR EXISTS (
    SELECT 1 FROM customer_cases WHERE customer_cases.id = viewed_case_logs.case_id 
    AND customer_cases.tenant_id = get_current_tenant_id()
  ));

-- office_settings (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'office_settings') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon read office_settings" ON office_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon insert office_settings" ON office_settings';
    EXECUTE 'DROP POLICY IF EXISTS "Allow anon update office_settings" ON office_settings';
    
    EXECUTE 'CREATE POLICY "Tenant isolation - SELECT office_settings" ON office_settings FOR SELECT TO anon
      USING (is_super_admin() OR tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "Tenant isolation - INSERT office_settings" ON office_settings FOR INSERT TO anon
      WITH CHECK (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "Tenant isolation - UPDATE office_settings" ON office_settings FOR UPDATE TO anon
      USING (is_super_admin() OR tenant_id = get_current_tenant_id())
      WITH CHECK (tenant_id = get_current_tenant_id())';
    EXECUTE 'CREATE POLICY "Tenant isolation - DELETE office_settings" ON office_settings FOR DELETE TO anon
      USING (is_super_admin() OR tenant_id = get_current_tenant_id())';
  END IF;
END $$;

-- ============================================================================
-- PHASE 4: Security Audit Logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  user_role text,
  event_type text NOT NULL CHECK (event_type IN (
    'login', 'logout', 'failed_login', 'data_access', 'data_modification', 
    'data_deletion', 'cross_tenant_attempt', 'permission_denied', 
    'context_set', 'context_cleared'
  )),
  table_name text,
  record_id uuid,
  action text,
  ip_address inet,
  user_agent text,
  request_path text,
  success boolean DEFAULT true,
  error_message text,
  additional_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON security_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON security_audit_logs(success) WHERE success = false;

ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access to audit logs" ON security_audit_logs FOR SELECT TO anon
  USING (is_super_admin());
CREATE POLICY "Tenant isolation - SELECT security_audit_logs" ON security_audit_logs FOR SELECT TO anon
  USING (is_super_admin() OR tenant_id = get_current_tenant_id());
CREATE POLICY "Allow insert audit logs" ON security_audit_logs FOR INSERT TO anon
  WITH CHECK (true);
CREATE POLICY "Super admin can delete audit logs" ON security_audit_logs FOR DELETE TO anon
  USING (is_super_admin());

CREATE OR REPLACE FUNCTION log_security_event(
  p_tenant_id uuid, p_user_id uuid, p_user_role text, p_event_type text,
  p_table_name text DEFAULT NULL, p_record_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL, p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL, p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE log_id uuid;
BEGIN
  INSERT INTO security_audit_logs (
    tenant_id, user_id, user_role, event_type, table_name,
    record_id, action, success, error_message, additional_data
  ) VALUES (
    p_tenant_id, p_user_id, p_user_role, p_event_type, p_table_name,
    p_record_id, p_action, p_success, p_error_message, p_additional_data
  ) RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT 'Migration completed successfully!' as status;
SELECT 'Functions created: ' || COUNT(*)::text as functions
FROM information_schema.routines 
WHERE routine_name IN ('get_current_tenant_id', 'is_super_admin', 'can_access_tenant', 'log_security_event');
SELECT 'RLS policies created: ' || COUNT(*)::text as policies
FROM pg_policies WHERE policyname LIKE 'Tenant isolation%';
SELECT 'Audit table created: ' || CASE WHEN EXISTS (
  SELECT FROM pg_tables WHERE tablename = 'security_audit_logs'
) THEN 'YES' ELSE 'NO' END as audit_table;
