/*
  ===============================================================================
  TABLE 15: user_activity
  Tracking employee login/logout and activity status
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  logout_time TIMESTAMP WITH TIME ZONE,
  last_active_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'Online' CHECK (status IN ('Online', 'Break', 'Offline', 'Idle')),
  total_break_time INTEGER DEFAULT 0, -- in minutes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_id ON user_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_employee_id ON user_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logout_time ON user_activity(logout_time) WHERE logout_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_activity_status ON user_activity(status);

-- Triggers
CREATE OR REPLACE FUNCTION update_user_activity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_activity_updated_at
  BEFORE UPDATE ON user_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_user_activity_updated_at();

-- RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read user_activity"
  ON user_activity FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert user_activity"
  ON user_activity FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update user_activity"
  ON user_activity FOR UPDATE
  TO anon
  USING (true);
