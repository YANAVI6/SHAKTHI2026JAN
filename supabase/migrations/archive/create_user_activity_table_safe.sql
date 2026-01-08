-- Migration: Create user_activity table and policies safely
-- Tracks employee login/logout and activity status

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- 2. Create indexes safely
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_id ON user_activity(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_employee_id ON user_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_logout_time ON user_activity(logout_time) WHERE logout_time IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_activity_status ON user_activity(status);

-- 3. Enable RLS
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Allow anon read user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon insert user_activity" ON user_activity;
DROP POLICY IF EXISTS "Allow anon update user_activity" ON user_activity;

-- 5. Re-create policies
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
