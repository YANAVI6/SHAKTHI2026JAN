-- FORCE ENABLE REALTIME and SET REPLICA IDENTITY
-- This ensures that chat_messages broadcasts all events correctly.

BEGIN;

  -- 1. Ensure table exists (sanity check)
  -- 2. Set Replica Identity to FULL (ensures OLD values are sent on DELETE/UPDATE)
  ALTER TABLE chat_messages REPLICA IDENTITY FULL;
  ALTER TABLE chat_channels REPLICA IDENTITY FULL;
  ALTER TABLE chat_channel_members REPLICA IDENTITY FULL;

  -- 3. Add to supabase_realtime publication
  -- We drop and re-add to be sure, or just add if missing.
  -- Simpler: remove then add.
  ALTER PUBLICATION supabase_realtime DROP TABLE chat_messages;
  ALTER PUBLICATION supabase_realtime DROP TABLE chat_channels;
  ALTER PUBLICATION supabase_realtime DROP TABLE chat_channel_members;

  ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
  ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;

COMMIT;
