-- FINAL REALTIME FIX: Allow PUBLIC access to ALL chat tables
-- This ensures that regardless of Anon vs Authenticated, the user can subscribe.
-- This is necessary because custom auth implementation maps users differently than Supabase Auth.

BEGIN;

  -- 1. chat_messages
  DROP POLICY IF EXISTS "Allow authenticated view messages" ON chat_messages;
  DROP POLICY IF EXISTS "Allow anon all" ON chat_messages;
  DROP POLICY IF EXISTS "Allow public all" ON chat_messages; -- Just in case
  CREATE POLICY "Allow public all" ON chat_messages FOR ALL TO public USING (true) WITH CHECK (true);

  -- 2. chat_channel_members
  DROP POLICY IF EXISTS "Allow authenticated view members" ON chat_channel_members;
  DROP POLICY IF EXISTS "Allow anon all" ON chat_channel_members;
  DROP POLICY IF EXISTS "Allow public all" ON chat_channel_members;
  CREATE POLICY "Allow public all" ON chat_channel_members FOR ALL TO public USING (true) WITH CHECK (true);

  -- 3. chat_user_status
  DROP POLICY IF EXISTS "Allow authenticated view status" ON chat_user_status; -- hypothetical name
  DROP POLICY IF EXISTS "Allow anon all" ON chat_user_status; 
  DROP POLICY IF EXISTS "Allow public all" ON chat_user_status;
  CREATE POLICY "Allow public all" ON chat_user_status FOR ALL TO public USING (true) WITH CHECK (true);

  -- 4. chat_typing_indicators
  DROP POLICY IF EXISTS "Allow anon all" ON chat_typing_indicators;
  DROP POLICY IF EXISTS "Allow public all" ON chat_typing_indicators;
  CREATE POLICY "Allow public all" ON chat_typing_indicators FOR ALL TO public USING (true) WITH CHECK (true);

  -- 5. chat_channels (Reinforce if missing)
  DROP POLICY IF EXISTS "Allow authenticated view channels" ON chat_channels;
  -- "Allow public all" should already exist from previous step, but let's be safe (idempotent CREATE errors if exists, so we drop first)
  DROP POLICY IF EXISTS "Allow public all" ON chat_channels;
  CREATE POLICY "Allow public all" ON chat_channels FOR ALL TO public USING (true) WITH CHECK (true);

COMMIT;
