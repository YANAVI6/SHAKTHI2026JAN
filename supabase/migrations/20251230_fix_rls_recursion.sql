-- FIX RLS RECURSION: Use SECURITY DEFINER function to fetch tenant_id
-- This solves the issue where users cannot see data because checking their permissions
-- requires reading the 'employees' table, which is itself blocked by RLS.

-- 1. Create a helper function that bypasses RLS
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- runs as owner, bypassing RLS
STABLE
SET search_path = public -- secure search path
AS $$
  SELECT tenant_id FROM public.employees WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Update EMPLOYEES policy to use this function (Breaking the recursion)
DROP POLICY IF EXISTS "Allow authenticated to read employees" ON employees;
CREATE POLICY "Allow authenticated to read employees" ON employees
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR 
    tenant_id = get_auth_tenant_id()
  );

-- 3. Update CHAT policies to use this function for better performance and stability

-- Chat Channels
DROP POLICY IF EXISTS "Users can view channels in their tenant" ON chat_channels;
CREATE POLICY "Users can view channels in their tenant" ON chat_channels
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
  );

DROP POLICY IF EXISTS "Users can create channels in their tenant" ON chat_channels;
CREATE POLICY "Users can create channels in their tenant" ON chat_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
  );

DROP POLICY IF EXISTS "Users can update channels in their tenant" ON chat_channels;
CREATE POLICY "Users can update channels in their tenant" ON chat_channels
  FOR UPDATE TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
  );

-- Chat Messages
DROP POLICY IF EXISTS "Users can send messages to their channels" ON chat_messages;
CREATE POLICY "Users can send messages to their channels" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = get_auth_tenant_id()
    AND
    sender_id = auth.uid()
    -- We can keep the membership check as is, or optimize it too, 
    -- but usually tenant check is sufficient for broad isolation.
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = auth.uid()
    )
  );

-- Chat User Status
DROP POLICY IF EXISTS "Users can update their own status" ON chat_user_status;
CREATE POLICY "Users can update their own status" ON chat_user_status
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND
    tenant_id = get_auth_tenant_id()
  );

DROP POLICY IF EXISTS "Users can view status" ON chat_user_status;
CREATE POLICY "Users can view status" ON chat_user_status
  FOR SELECT TO authenticated
  USING (
    tenant_id = get_auth_tenant_id()
  );

-- DEBUGGING NOTE:
-- If data is still missing after running this, run this query in SQL Editor
-- to verify your user exists in the employees table:
-- SELECT * FROM employees WHERE id = auth.uid();
