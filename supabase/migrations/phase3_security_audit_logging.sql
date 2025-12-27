-- ============================================================================
-- PHASE 3: Security Audit Logging
-- ============================================================================
-- This migration creates audit logging for security events
-- ============================================================================

-- Create security_audit_logs table
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  user_role text,
  
  -- Event details
  event_type text NOT NULL CHECK (event_type IN (
    'login', 'logout', 'failed_login',
    'data_access', 'data_modification', 'data_deletion',
    'cross_tenant_attempt', 'permission_denied',
    'context_set', 'context_cleared'
  )),
  table_name text,
  record_id uuid,
  action text,
  
  -- Request details
  ip_address inet,
  user_agent text,
  request_path text,
  
  -- Result
  success boolean DEFAULT true,
  error_message text,
  additional_data jsonb DEFAULT '{}'::jsonb,
  
  -- Metadata
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON security_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON security_audit_logs(success) WHERE success = false;

-- RLS for audit logs
ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can see all audit logs
CREATE POLICY "Super admin full access to audit logs"
  ON security_audit_logs FOR SELECT
  TO anon
  USING (is_super_admin());

-- Regular users can only see their own tenant's audit logs
CREATE POLICY "Tenant isolation - SELECT security_audit_logs"
  ON security_audit_logs FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- Anyone can insert audit logs (for logging)
CREATE POLICY "Allow insert audit logs"
  ON security_audit_logs FOR INSERT
  TO anon
  WITH CHECK (true);

-- Only super admins can delete audit logs
CREATE POLICY "Super admin can delete audit logs"
  ON security_audit_logs FOR DELETE
  TO anon
  USING (is_super_admin());

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  p_tenant_id uuid,
  p_user_id uuid,
  p_user_role text,
  p_event_type text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO security_audit_logs (
    tenant_id,
    user_id,
    user_role,
    event_type,
    table_name,
    record_id,
    action,
    success,
    error_message,
    additional_data
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_user_role,
    p_event_type,
    p_table_name,
    p_record_id,
    p_action,
    p_success,
    p_error_message,
    p_additional_data
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to get recent security events for a tenant
CREATE OR REPLACE FUNCTION get_recent_security_events(
  p_tenant_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  id uuid,
  event_type text,
  user_id uuid,
  table_name text,
  action text,
  success boolean,
  error_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins or users from the same tenant can view
  IF NOT (is_super_admin() OR p_tenant_id = get_current_tenant_id()) THEN
    RAISE EXCEPTION 'Unauthorized access to security logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    sal.id,
    sal.event_type,
    sal.user_id,
    sal.table_name,
    sal.action,
    sal.success,
    sal.error_message,
    sal.created_at
  FROM security_audit_logs sal
  WHERE sal.tenant_id = p_tenant_id
  ORDER BY sal.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Function to get failed access attempts
CREATE OR REPLACE FUNCTION get_failed_access_attempts(
  p_tenant_id uuid DEFAULT NULL,
  p_hours integer DEFAULT 24
)
RETURNS TABLE (
  id uuid,
  tenant_id uuid,
  user_id uuid,
  event_type text,
  table_name text,
  error_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only super admins can view all tenants
  IF p_tenant_id IS NULL AND NOT is_super_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Only super admins can view all failed attempts';
  END IF;
  
  -- Regular users can only see their tenant
  IF p_tenant_id IS NOT NULL AND NOT (is_super_admin() OR p_tenant_id = get_current_tenant_id()) THEN
    RAISE EXCEPTION 'Unauthorized access to security logs';
  END IF;
  
  RETURN QUERY
  SELECT 
    sal.id,
    sal.tenant_id,
    sal.user_id,
    sal.event_type,
    sal.table_name,
    sal.error_message,
    sal.created_at
  FROM security_audit_logs sal
  WHERE 
    sal.success = false
    AND sal.created_at > (now() - (p_hours || ' hours')::interval)
    AND (p_tenant_id IS NULL OR sal.tenant_id = p_tenant_id)
  ORDER BY sal.created_at DESC;
END;
$$;

-- Add comments
COMMENT ON TABLE security_audit_logs IS 'Stores security audit logs for compliance and monitoring';
COMMENT ON FUNCTION log_security_event IS 'Logs a security event to the audit log';
COMMENT ON FUNCTION get_recent_security_events IS 'Retrieves recent security events for a tenant';
COMMENT ON FUNCTION get_failed_access_attempts IS 'Retrieves failed access attempts for monitoring';
