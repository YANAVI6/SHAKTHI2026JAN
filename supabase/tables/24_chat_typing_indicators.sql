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
