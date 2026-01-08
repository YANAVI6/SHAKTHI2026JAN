-- FIX: Enable Anonymous Access for Chat Tables (Required for Custom Auth)
-- The application uses a custom authentication system (via 'employees' table) 
-- and does NOT use Supabase Auth sessions. Therefore, the client connection 
-- is always 'anon' (anonymous).
--
-- The previous 'TO authenticated' policies block the application from working.
-- We must allow 'anon' access for the chat features to function.

-- ============================================================================
-- 1. CHAT CHANNELS
-- ============================================================================
CREATE POLICY "Allow anon select chat_channels" ON chat_channels
  FOR SELECT TO anon
  USING (true); -- Client filters by tenant_id, RLS allows all for anon

CREATE POLICY "Allow anon insert chat_channels" ON chat_channels
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update chat_channels" ON chat_channels
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete chat_channels" ON chat_channels
  FOR DELETE TO anon
  USING (true);


-- ============================================================================
-- 2. CHAT CHANNEL MEMBERS
-- ============================================================================
CREATE POLICY "Allow anon select chat_channel_members" ON chat_channel_members
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert chat_channel_members" ON chat_channel_members
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update chat_channel_members" ON chat_channel_members
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete chat_channel_members" ON chat_channel_members
  FOR DELETE TO anon
  USING (true);


-- ============================================================================
-- 3. CHAT MESSAGES
-- ============================================================================
CREATE POLICY "Allow anon select chat_messages" ON chat_messages
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert chat_messages" ON chat_messages
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update chat_messages" ON chat_messages
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete chat_messages" ON chat_messages
  FOR DELETE TO anon
  USING (true);


-- ============================================================================
-- 4. CHAT USER STATUS
-- ============================================================================
CREATE POLICY "Allow anon select chat_user_status" ON chat_user_status
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert chat_user_status" ON chat_user_status
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update chat_user_status" ON chat_user_status
  FOR UPDATE TO anon
  USING (true);


-- ============================================================================
-- 5. CHAT TYPING INDICATORS
-- ============================================================================
CREATE POLICY "Allow anon select chat_typing_indicators" ON chat_typing_indicators
  FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert chat_typing_indicators" ON chat_typing_indicators
  FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update chat_typing_indicators" ON chat_typing_indicators
  FOR UPDATE TO anon
  USING (true);

CREATE POLICY "Allow anon delete chat_typing_indicators" ON chat_typing_indicators
  FOR DELETE TO anon
  USING (true);
