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
-- Chat Channel Members Table
-- Tracks which users are members of which channels

CREATE TABLE IF NOT EXISTS chat_channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  is_muted BOOLEAN DEFAULT FALSE,
  UNIQUE(channel_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_channel_members_channel ON chat_channel_members(channel_id);
CREATE INDEX idx_channel_members_user ON chat_channel_members(user_id);
CREATE INDEX idx_channel_members_last_read ON chat_channel_members(last_read_at);

-- Enable Row Level Security
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own channel memberships"
  ON chat_channel_members FOR SELECT
  TO anon, authenticated
  USING (
    user_id = auth.uid()
    OR
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join channels"
  ON chat_channel_members FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    channel_id IN (
      SELECT id FROM chat_channels 
      WHERE tenant_id IN (
        SELECT tenant_id FROM employees WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can update their own memberships"
  ON chat_channel_members FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can leave channels"
  ON chat_channel_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Comments
COMMENT ON TABLE chat_channel_members IS 'Tracks channel membership and read status';
COMMENT ON COLUMN chat_channel_members.last_read_at IS 'Timestamp of last message read, used for unread count';
COMMENT ON COLUMN chat_channel_members.is_muted IS 'Whether user has muted notifications for this channel';
-- Chat Messages Table
-- Stores all chat messages with tenant isolation

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  message_text TEXT NOT NULL,
  reply_to UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_chat_messages_tenant ON chat_messages(tenant_id);
CREATE INDEX idx_chat_messages_channel ON chat_messages(channel_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_reply ON chat_messages(reply_to) WHERE reply_to IS NOT NULL;

-- Enable Row Level Security
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tenant isolation
CREATE POLICY "Users can view messages in their tenant channels"
  ON chat_messages FOR SELECT
  TO anon, authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages to their channels"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
    AND
    sender_id = auth.uid()
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can edit their own messages"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (sender_id = auth.uid());

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_chat_messages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.is_edited = TRUE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chat_messages_updated_at
  BEFORE UPDATE ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_messages_updated_at();

-- Comments
COMMENT ON TABLE chat_messages IS 'Stores all chat messages with tenant isolation';
COMMENT ON COLUMN chat_messages.reply_to IS 'References another message if this is a reply';
COMMENT ON COLUMN chat_messages.is_edited IS 'Indicates if message has been edited';
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
-- Chat Typing Indicators Table
-- Tracks who is currently typing in which channel

CREATE TABLE IF NOT EXISTS chat_typing_indicators (
  channel_id UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_typing_channel ON chat_typing_indicators(channel_id);
CREATE INDEX idx_typing_user ON chat_typing_indicators(user_id);
CREATE INDEX idx_typing_started ON chat_typing_indicators(started_at);

-- Enable Row Level Security
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view typing indicators in their channels"
  ON chat_typing_indicators FOR SELECT
  TO anon, authenticated
  USING (
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can set their own typing indicator"
  ON chat_typing_indicators FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own typing indicator"
  ON chat_typing_indicators FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can remove their own typing indicator"
  ON chat_typing_indicators FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Function to auto-delete old typing indicators (older than 10 seconds)
CREATE OR REPLACE FUNCTION cleanup_old_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM chat_typing_indicators
  WHERE started_at < NOW() - INTERVAL '10 seconds';
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE chat_typing_indicators IS 'Tracks real-time typing indicators';
COMMENT ON COLUMN chat_typing_indicators.started_at IS 'When user started typing, auto-deleted after 10 seconds';
