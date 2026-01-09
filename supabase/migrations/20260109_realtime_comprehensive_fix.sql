-- COMPREHENSIVE REALTIME FIX: Chat + Activity Tracking
-- Run this to fix ALL Realtime issues across the application

BEGIN;

  -----------------------------------------------------------------------------
  -- 1. FORCE REALTIME CONFIGURATION (Replica Identity)
  -----------------------------------------------------------------------------
  ALTER TABLE chat_messages REPLICA IDENTITY FULL;
  ALTER TABLE chat_channels REPLICA IDENTITY FULL;
  ALTER TABLE chat_channel_members REPLICA IDENTITY FULL;
  ALTER TABLE chat_typing_indicators REPLICA IDENTITY FULL;
  ALTER TABLE chat_user_status REPLICA IDENTITY FULL;
  ALTER TABLE user_activity REPLICA IDENTITY FULL;

  -----------------------------------------------------------------------------
  -- 2. UPDATE PUBLICATION
  -- Remove and Re-add to ensure clean state
  -----------------------------------------------------------------------------
  -- Chat tables (errors are ignored if table not in publication)
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE chat_messages;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
  
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE chat_channels;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
  
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE chat_channel_members;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
  
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE chat_typing_indicators;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
  
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE chat_user_status;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;
  
  -- Activity tracking
  DO $$
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE user_activity;
  EXCEPTION WHEN OTHERS THEN NULL;
  END $$;

  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing_indicators;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_user_status;
  ALTER PUBLICATION supabase_realtime ADD TABLE user_activity;

  -----------------------------------------------------------------------------
  -- 3. APPLY PERMISSIVE RLS POLICIES (Fix Permission Issues)
  -----------------------------------------------------------------------------
  -- Enable RLS
  ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
  ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
  ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

  -- chat_messages
  DROP POLICY IF EXISTS "Allow authenticated view messages" ON chat_messages;
  DROP POLICY IF EXISTS "Allow anon all" ON chat_messages;
  DROP POLICY IF EXISTS "Allow public all" ON chat_messages; 
  CREATE POLICY "Allow public all" ON chat_messages FOR ALL TO public USING (true) WITH CHECK (true);

  -- chat_channels
  DROP POLICY IF EXISTS "Allow public all" ON chat_channels;
  CREATE POLICY "Allow public all" ON chat_channels FOR ALL TO public USING (true) WITH CHECK (true);

  -- chat_channel_members
  DROP POLICY IF EXISTS "Allow public all" ON chat_channel_members;
  CREATE POLICY "Allow public all" ON chat_channel_members FOR ALL TO public USING (true) WITH CHECK (true);

  -- chat_typing_indicators
  DROP POLICY IF EXISTS "Allow public all" ON chat_typing_indicators;
  CREATE POLICY "Allow public all" ON chat_typing_indicators FOR ALL TO public USING (true) WITH CHECK (true);

  -- chat_user_status
  DROP POLICY IF EXISTS "Allow public all" ON chat_user_status;
  CREATE POLICY "Allow public all" ON chat_user_status FOR ALL TO public USING (true) WITH CHECK (true);

  -- user_activity
  DROP POLICY IF EXISTS "Allow anon all" ON user_activity;
  DROP POLICY IF EXISTS "Allow public all" ON user_activity;
  CREATE POLICY "Allow public all" ON user_activity FOR ALL TO public USING (true) WITH CHECK (true);

COMMIT;
