DO $$
BEGIN
    -- 1. Clean up orphaned data in chat tables before creating internal links
    DELETE FROM chat_channel_members WHERE channel_id NOT IN (SELECT id FROM chat_channels);
    DELETE FROM chat_messages WHERE channel_id NOT IN (SELECT id FROM chat_channels);
    DELETE FROM chat_typing_indicators WHERE channel_id NOT IN (SELECT id FROM chat_channels);

    -- 2. NOW safely restore internal relationships (Fix PGRST200 / missing relationship error)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_channel_members_channel_id_fkey') THEN
        ALTER TABLE chat_channel_members 
        ADD CONSTRAINT chat_channel_members_channel_id_fkey 
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_messages_channel_id_fkey') THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT chat_messages_channel_id_fkey 
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_typing_indicators_channel_id_fkey') THEN
        ALTER TABLE chat_typing_indicators 
        ADD CONSTRAINT chat_typing_indicators_channel_id_fkey 
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;
    END IF;

END $$;

-- Force reload schema cache one more time
NOTIFY pgrst, 'reload schema';
