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
