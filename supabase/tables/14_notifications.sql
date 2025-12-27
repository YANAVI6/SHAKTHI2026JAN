/*
  ===============================================================================
  TABLE 14: notifications
  System notifications for users and teams
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'team', 'user')),
  target_id UUID, -- Can be team_id or user_id, nullable if target_type is 'all'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE -- For individual tracking
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_id ON notifications(target_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies (Adapted for anon access pattern used in other tables)
CREATE POLICY "Allow anon read notifications"
  ON notifications FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert notifications"
  ON notifications FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update notifications"
  ON notifications FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon delete notifications"
  ON notifications FOR DELETE
  TO anon
  USING (true);
