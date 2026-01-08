-- Chat User Status Table
-- Tracks online/offline status of users

CREATE TABLE IF NOT EXISTS chat_user_status (
  user_id UUID PRIMARY KEY REFERENCES employees(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline' CHECK (status IN ('online', 'away', 'offline')),
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_user_status_tenant ON chat_user_status(tenant_id);
CREATE INDEX idx_chat_user_status_status ON chat_user_status(status);
CREATE INDEX idx_chat_user_status_last_seen ON chat_user_status(last_seen DESC);

-- Enable Row Level Security
ALTER TABLE chat_user_status ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view status of users in their tenant"
  ON chat_user_status FOR SELECT
  TO anon, authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own status"
  ON chat_user_status FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own status record"
  ON chat_user_status FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_user_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_user_status_updated_at
  BEFORE UPDATE ON chat_user_status
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_user_status_updated_at();

-- Comments
COMMENT ON TABLE chat_user_status IS 'Tracks user online/offline status';
COMMENT ON COLUMN chat_user_status.status IS 'User status: online, away, offline';
COMMENT ON COLUMN chat_user_status.last_seen IS 'Last time user was active';
