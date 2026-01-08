-- FIX: Enable proper RLS for authenticated users to support Realtime
-- The previous policies often targeted 'anon' which may exclude logged-in users depending on role config.
-- This migration explicitly ensures 'authenticated' users can access necessary tables.

-- 1. Employees Table
DROP POLICY IF EXISTS "Allow authenticated to read employees" ON employees;
CREATE POLICY "Allow authenticated to read employees"
  ON employees FOR SELECT
  TO authenticated
  USING (
    -- Allow reading own record (critical for other policies)
    id = auth.uid() OR
    -- Allow reading colleagues in same tenant (needed for Chat UI names)
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

-- 2. Chat Channel Members
DROP POLICY IF EXISTS "Allow authenticated view members" ON chat_channel_members;
CREATE POLICY "Allow authenticated view members"
  ON chat_channel_members FOR SELECT
  TO authenticated
  USING (
    -- Can view if I am a member, or if I am in the same tenant (broader allow for safety?)
    -- Let's stick to the secure rule: Can view memberships of channels I am in.
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
    OR
    user_id = auth.uid()
  );

-- 3. Chat Channels
DROP POLICY IF EXISTS "Allow authenticated view channels" ON chat_channels;
CREATE POLICY "Allow authenticated view channels"
  ON chat_channels FOR SELECT
  TO authenticated
  USING (
    -- Standard tenant isolation
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
  );

-- 4. Chat Messages (Ensure explicit authenticated policy)
-- Note: Existing policy likely covers it, but reinforcing doesn't hurt.
DROP POLICY IF EXISTS "Allow authenticated view messages" ON chat_messages;
CREATE POLICY "Allow authenticated view messages"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = auth.uid()
    )
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );
