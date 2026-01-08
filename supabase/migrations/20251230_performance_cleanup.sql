-- PERFORMANCE FIX: Optimize RLS policies and remove redundancies
-- 1. Fix 'auth_rls_initplan': Wrap auth.uid() in (select auth.uid()) for better query planning
-- 2. Fix 'multiple_permissive_policies': Remove duplicate/overlapping policies

-- ============================================================================
-- 1. CLEANUP REDUNDANT POLICIES (Fix multiple_permissive_policies)
-- ============================================================================

-- Chat Typing Indicators
DROP POLICY IF EXISTS "Users can view typing indicators in their channels" ON chat_typing_indicators;
-- Note: We keep "Users can view typing indicators" which we created recently

-- Chat User Status
DROP POLICY IF EXISTS "Users can view status of users in their tenant" ON chat_user_status;
-- Note: We keep "Users can view status" which we created recently


-- ============================================================================
-- 2. OPTIMIZE EXISTING POLICIES (Fix auth_rls_initplan)
-- ============================================================================

-- Chat Channels
DROP POLICY IF EXISTS "Users can view channels in their tenant" ON chat_channels;
CREATE POLICY "Users can view channels in their tenant" ON chat_channels
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create channels in their tenant" ON chat_channels;
CREATE POLICY "Users can create channels in their tenant" ON chat_channels
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update channels in their tenant" ON chat_channels;
CREATE POLICY "Users can update channels in their tenant" ON chat_channels
  FOR UPDATE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Admins can delete channels in their tenant" ON chat_channels;
CREATE POLICY "Admins can delete channels in their tenant" ON chat_channels
  FOR DELETE TO authenticated
  USING (
    tenant_id IN (
      SELECT tenant_id FROM employees 
      WHERE id = (select auth.uid()) 
      AND role IN ('CompanyAdmin', 'SuperAdmin')
    )
  );


-- Chat Channel Members
DROP POLICY IF EXISTS "Users can view their own channel memberships" ON chat_channel_members;
CREATE POLICY "Users can view their own channel memberships" ON chat_channel_members
  FOR SELECT TO authenticated
  USING (
    user_id = (select auth.uid())
    OR
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can join channels" ON chat_channel_members;
CREATE POLICY "Users can join channels" ON chat_channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND
    channel_id IN (
      SELECT id FROM chat_channels 
      WHERE tenant_id IN (
        SELECT tenant_id FROM employees WHERE id = (select auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "Users can update their own memberships" ON chat_channel_members;
CREATE POLICY "Users can update their own memberships" ON chat_channel_members
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can leave channels" ON chat_channel_members;
CREATE POLICY "Users can leave channels" ON chat_channel_members
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));


-- Chat Messages
DROP POLICY IF EXISTS "Users can send messages to their channels" ON chat_messages;
CREATE POLICY "Users can send messages to their channels" ON chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
    AND
    sender_id = (select auth.uid())
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can edit their own messages" ON chat_messages;
CREATE POLICY "Users can edit their own messages" ON chat_messages
  FOR UPDATE TO authenticated
  USING (sender_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own messages" ON chat_messages;
CREATE POLICY "Users can delete their own messages" ON chat_messages
  FOR DELETE TO authenticated
  USING (sender_id = (select auth.uid()));

-- Re-optimize the one we created recently "Allow authenticated view messages"
DROP POLICY IF EXISTS "Allow authenticated view messages" ON chat_messages;
CREATE POLICY "Allow authenticated view messages" ON chat_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM chat_channel_members 
        WHERE channel_id = chat_messages.channel_id 
        AND user_id = (select auth.uid())
    )
  );


-- Chat User Status
DROP POLICY IF EXISTS "Users can update their own status" ON chat_user_status;
CREATE POLICY "Users can update their own status" ON chat_user_status
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own status record" ON chat_user_status;
CREATE POLICY "Users can update their own status record" ON chat_user_status
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

-- Re-optimize "Users can view status"
DROP POLICY IF EXISTS "Users can view status" ON chat_user_status;
CREATE POLICY "Users can view status" ON chat_user_status
  FOR SELECT TO authenticated
  USING (
    tenant_id IN (
        SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
  );


-- Chat Typing Indicators
DROP POLICY IF EXISTS "Users can set their own typing indicator" ON chat_typing_indicators;
CREATE POLICY "Users can set their own typing indicator" ON chat_typing_indicators
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND
    channel_id IN (
      SELECT channel_id FROM chat_channel_members WHERE user_id = (select auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update their own typing indicator" ON chat_typing_indicators;
CREATE POLICY "Users can update their own typing indicator" ON chat_typing_indicators
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can remove their own typing indicator" ON chat_typing_indicators;
CREATE POLICY "Users can remove their own typing indicator" ON chat_typing_indicators
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()));

-- Re-optimize "Users can view typing indicators"
DROP POLICY IF EXISTS "Users can view typing indicators" ON chat_typing_indicators;
CREATE POLICY "Users can view typing indicators" ON chat_typing_indicators
  FOR SELECT TO authenticated
  USING (
    EXISTS (
        SELECT 1 FROM chat_channel_members 
        WHERE channel_id = chat_typing_indicators.channel_id 
        AND user_id = (select auth.uid())
    )
  );

-- Employees policy re-optimization
DROP POLICY IF EXISTS "Allow authenticated to read employees" ON employees;
CREATE POLICY "Allow authenticated to read employees" ON employees
  FOR SELECT TO authenticated
  USING (
    id = (select auth.uid())
    OR 
    tenant_id IN (
      SELECT tenant_id FROM employees WHERE id = (select auth.uid())
    )
  );
