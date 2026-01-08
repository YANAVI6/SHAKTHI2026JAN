-- Chat Channels Table
-- Stores different types of chat channels (general, team, direct, role-based)

CREATE TABLE IF NOT EXISTS chat_channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('general', 'team', 'direct', 'role')),
  description TEXT,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  role TEXT, -- For role-based channels (Telecaller, TeamIncharge, CompanyAdmin)
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, name, type)
);

-- Indexes for performance
CREATE INDEX idx_chat_channels_tenant ON chat_channels(tenant_id);
CREATE INDEX idx_chat_channels_team ON chat_channels(team_id);
CREATE INDEX idx_chat_channels_type ON chat_channels(type);
CREATE INDEX idx_chat_channels_created ON chat_channels(created_at DESC);

-- Enable Row Level Security
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view channels in their tenant"
  ON chat_channels FOR SELECT
  TO anon, authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create channels in their tenant"
  ON chat_channels FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update channels in their tenant"
  ON chat_channels FOR UPDATE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can delete channels in their tenant"
  ON chat_channels FOR DELETE
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees 
      WHERE id = auth.uid() 
      AND role IN ('CompanyAdmin', 'SuperAdmin')
    )
  );

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_channels_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_channels_updated_at
  BEFORE UPDATE ON chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_channels_updated_at();

-- Comments
COMMENT ON TABLE chat_channels IS 'Stores chat channels with tenant isolation';
COMMENT ON COLUMN chat_channels.type IS 'Channel type: general (tenant-wide), team (team-specific), direct (1-on-1), role (role-based)';
COMMENT ON COLUMN chat_channels.team_id IS 'References teams table for team-specific channels';
COMMENT ON COLUMN chat_channels.role IS 'For role-based channels: Telecaller, TeamIncharge, CompanyAdmin';
