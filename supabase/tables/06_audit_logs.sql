/*
  ===============================================================================
  TABLE 6: audit_logs
  Comprehensive audit logging for all system operations
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  user_id uuid,
  user_type text CHECK (user_type IN ('SuperAdmin', 'CompanyAdmin')),

  -- Action Details
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,

  -- Request Context
  ip_address text,
  user_agent text,

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to audit logs"
  ON audit_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to audit logs"
  ON audit_logs FOR INSERT
  TO anon
  WITH CHECK (true);
