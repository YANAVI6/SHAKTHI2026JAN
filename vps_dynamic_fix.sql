DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all foreign keys that reference the 'employees' table across the whole database
    -- This is the only way to be 100% sure we hit the right ones
    FOR r IN (
        SELECT 
            tc.table_name, 
            tc.constraint_name
        FROM 
            information_schema.table_constraints AS tc 
            JOIN information_schema.key_column_usage AS kcu
              ON tc.constraint_name = kcu.constraint_name
              AND tc.table_schema = kcu.table_schema
            JOIN information_schema.constraint_column_usage AS ccu
              ON ccu.constraint_name = tc.constraint_name
              AND ccu.table_schema = tc.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' 
          AND ccu.table_name = 'employees'
          AND tc.table_name IN ('user_activity', 'chat_channels', 'chat_messages', 'chat_channel_members', 'chat_user_status', 'chat_typing_indicators')
    ) LOOP
        EXECUTE 'ALTER TABLE ' || quote_ident(r.table_name) || ' DROP CONSTRAINT ' || quote_ident(r.constraint_name);
        RAISE NOTICE 'Dropped constraint % from table %', r.constraint_name, r.table_name;
    END LOOP;

    -- Also drop the status check on chat_user_status if it exists to allow 'break', 'idle'
    FOR r IN (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'chat_user_status' AND constraint_type = 'CHECK' AND constraint_name LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE chat_user_status DROP CONSTRAINT ' || quote_ident(r.constraint_name);
    END LOOP;
    
    ALTER TABLE chat_user_status ADD CONSTRAINT chat_user_status_status_check 
    CHECK (status IN ('online', 'away', 'offline', 'break', 'idle', 'busy'));

    -- Ensure chat_channel_members -> chat_channels relation exists (internal link)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_channel_members_channel_id_fkey') THEN
        ALTER TABLE chat_channel_members 
        ADD CONSTRAINT chat_channel_members_channel_id_fkey 
        FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;
    END IF;

END $$;

-- Force reload schema cache
NOTIFY pgrst, 'reload schema';
