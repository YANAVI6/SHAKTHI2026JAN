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
