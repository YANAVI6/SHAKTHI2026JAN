-- Ensure chat_channels is enabled for Realtime
-- This is critical for users to see new DMs appear without refreshing

BEGIN;

  -- 1. Chat Channels
  -- Check if table exists in publication, if not add it
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'chat_channels'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_channels;
    END IF;
  END $$;

  -- 2. Chat Channel Members (Ensure it's definitely there)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'chat_channel_members'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_channel_members;
    END IF;
  END $$;

  -- 3. Confirm others are there (Messages, Typing, Status were likely added, but safety first)
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'chat_messages'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'chat_typing_indicators'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_typing_indicators;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND tablename = 'chat_user_status'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE chat_user_status;
    END IF;
  END $$;

COMMIT;
