-- COMPREHENSIVE FIX FOR REALTIME CHAT
-- 1. Ensure tables are included in the Realtime Publication
-- 2. Ensure RLS policies are simplified and authenticated-friendly

-- A. Add tables to supabase_realtime publication
-- This is often missed when creating tables via migrations
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_user_status;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members; -- Needed for membership checks if client subscribes? mostly not, but good for safety.

-- B. Fix RLS - Employees (Source of Truth)
-- Ensure we can ALWAYS read our own employee record without session variables
DROP POLICY IF EXISTS "Allow authenticated to read employees" ON employees;
CREATE POLICY "Allow authenticated to read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    -- Simple check: Can read my own record
    id = auth.uid() 
    OR 
    -- Can read anyone in my tenant (fetched from my own record)
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

-- C. Fix RLS - Chat Messages
-- Simplified policy that avoids complex joins if possible, or ensures they work
DROP POLICY IF EXISTS "Users can view messages in their tenant channels" ON chat_messages;
DROP POLICY IF EXISTS "Allow authenticated view messages" ON chat_messages;

CREATE POLICY "Allow authenticated view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    -- Message must be in a channel I belong to
    EXISTS (
        SELECT 1 FROM chat_channel_members 
        WHERE channel_id = chat_messages.channel_id 
        AND user_id = auth.uid()
    )
  );

-- D. Fix RLS - Chat Typing Indicators
DROP POLICY IF EXISTS "Users can view typing indicators" ON chat_typing_indicators;
CREATE POLICY "Users can view typing indicators"
  ON chat_typing_indicators FOR SELECT
  TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM chat_channel_members 
        WHERE channel_id = chat_typing_indicators.channel_id 
        AND user_id = auth.uid()
    )
  );

-- E. Fix RLS - User Status
DROP POLICY IF EXISTS "Users can view status" ON chat_user_status;
CREATE POLICY "Users can view status"
  ON chat_user_status FOR SELECT
  TO authenticated
  USING (
    -- View status of users in my tenant
    tenant_id IN (
        SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );
