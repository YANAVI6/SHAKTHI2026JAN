-- Individual DROP commands to ensure they stick even if others fail
ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_employee_id_fkey;
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE chat_channel_members DROP CONSTRAINT IF EXISTS chat_channel_members_user_id_fkey;
ALTER TABLE chat_user_status DROP CONSTRAINT IF EXISTS chat_user_status_user_id_fkey;
ALTER TABLE chat_typing_indicators DROP CONSTRAINT IF EXISTS chat_typing_indicators_user_id_fkey;

-- Cleanup orphans
DELETE FROM chat_channel_members WHERE channel_id NOT IN (SELECT id FROM chat_channels);
DELETE FROM chat_messages WHERE channel_id NOT IN (SELECT id FROM chat_channels);
DELETE FROM chat_typing_indicators WHERE channel_id NOT IN (SELECT id FROM chat_channels);

-- Restore internal links
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_channel_members_channel_id_fkey') THEN
        ALTER TABLE chat_channel_members 
        ADD CONSTRAINT chat_channel_members_channel_id_fkey 
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_channel_id_fkey') THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT chat_messages_channel_id_fkey 
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Fix status check
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_user_status_status_check') THEN
        ALTER TABLE chat_user_status DROP CONSTRAINT chat_user_status_status_check;
    END IF;
END $$;
ALTER TABLE chat_user_status ADD CONSTRAINT chat_user_status_status_check 
CHECK (status IN ('online', 'away', 'offline', 'break', 'idle', 'busy'));

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
