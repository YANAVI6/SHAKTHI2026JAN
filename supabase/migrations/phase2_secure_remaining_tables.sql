-- ============================================================================
-- PHASE 2: Secure RLS Policies for Remaining Tables
-- ============================================================================
-- This migration secures all remaining tables with tenant isolation
-- ============================================================================

-- ============================================================================
-- TABLE: teams
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read teams" ON teams;
DROP POLICY IF EXISTS "Allow anon insert teams" ON teams;
DROP POLICY IF EXISTS "Allow anon update teams" ON teams;
DROP POLICY IF EXISTS "Allow anon delete teams" ON teams;

CREATE POLICY "Tenant isolation - SELECT teams"
  ON teams FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT teams"
  ON teams FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE teams"
  ON teams FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE teams"
  ON teams FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: team_telecallers
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read team_telecallers" ON team_telecallers;
DROP POLICY IF EXISTS "Allow anon insert team_telecallers" ON team_telecallers;
DROP POLICY IF EXISTS "Allow anon update team_telecallers" ON team_telecallers;
DROP POLICY IF EXISTS "Allow anon delete team_telecallers" ON team_telecallers;

CREATE POLICY "Tenant isolation - SELECT team_telecallers"
  ON team_telecallers FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT team_telecallers"
  ON team_telecallers FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE team_telecallers"
  ON team_telecallers FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE team_telecallers"
  ON team_telecallers FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: telecaller_targets
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read telecaller_targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon insert telecaller_targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon update telecaller_targets" ON telecaller_targets;
DROP POLICY IF EXISTS "Allow anon delete telecaller_targets" ON telecaller_targets;

CREATE POLICY "Tenant isolation - SELECT telecaller_targets"
  ON telecaller_targets FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT telecaller_targets"
  ON telecaller_targets FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE telecaller_targets"
  ON telecaller_targets FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE telecaller_targets"
  ON telecaller_targets FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: notifications
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon insert notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon update notifications" ON notifications;
DROP POLICY IF EXISTS "Allow anon delete notifications" ON notifications;

CREATE POLICY "Tenant isolation - SELECT notifications"
  ON notifications FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE notifications"
  ON notifications FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE notifications"
  ON notifications FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: user_activity
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon insert user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon update user_activity" ON user_activity;

CREATE POLICY "Tenant isolation - SELECT user_activity"
  ON user_activity FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT user_activity"
  ON user_activity FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE user_activity"
  ON user_activity FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE user_activity"
  ON user_activity FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: column_configurations
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read column_configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon insert column_configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon update column_configurations" ON column_configurations;
DROP POLICY IF EXISTS "Allow anon delete column_configurations" ON column_configurations;

CREATE POLICY "Tenant isolation - SELECT column_configurations"
  ON column_configurations FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT column_configurations"
  ON column_configurations FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE column_configurations"
  ON column_configurations FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE column_configurations"
  ON column_configurations FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: case_views
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read case_views" ON case_views;
DROP POLICY IF EXISTS "Allow anon insert case_views" ON case_views;
DROP POLICY IF EXISTS "Allow anon update case_views" ON case_views;
DROP POLICY IF EXISTS "Allow anon delete case_views" ON case_views;

CREATE POLICY "Tenant isolation - SELECT case_views"
  ON case_views FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT case_views"
  ON case_views FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE case_views"
  ON case_views FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE case_views"
  ON case_views FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: viewed_case_logs
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read viewed_case_logs" ON viewed_case_logs;
DROP POLICY IF EXISTS "Allow anon insert viewed_case_logs" ON viewed_case_logs;
DROP POLICY IF EXISTS "Allow anon update viewed_case_logs" ON viewed_case_logs;
DROP POLICY IF EXISTS "Allow anon delete viewed_case_logs" ON viewed_case_logs;

CREATE POLICY "Tenant isolation - SELECT viewed_case_logs"
  ON viewed_case_logs FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT viewed_case_logs"
  ON viewed_case_logs FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE viewed_case_logs"
  ON viewed_case_logs FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE viewed_case_logs"
  ON viewed_case_logs FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: office_settings (from Activity Tracker enhancement)
-- ============================================================================

DROP POLICY IF EXISTS "Allow anon read office_settings" ON office_settings;
DROP POLICY IF EXISTS "Allow anon insert office_settings" ON office_settings;
DROP POLICY IF EXISTS "Allow anon update office_settings" ON office_settings;

CREATE POLICY "Tenant isolation - SELECT office_settings"
  ON office_settings FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT office_settings"
  ON office_settings FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE office_settings"
  ON office_settings FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE office_settings"
  ON office_settings FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- Add comments for documentation
-- ============================================================================

COMMENT ON POLICY "Tenant isolation - SELECT teams" ON teams IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT team_telecallers" ON team_telecallers IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT telecaller_targets" ON telecaller_targets IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT notifications" ON notifications IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT user_activity" ON user_activity IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT column_configurations" ON column_configurations IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT case_views" ON case_views IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT viewed_case_logs" ON viewed_case_logs IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT office_settings" ON office_settings IS 'Phase 2: Enforces tenant isolation. Super admins can access all tenants.';
