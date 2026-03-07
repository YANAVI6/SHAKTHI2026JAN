-- Comprehensive Fix for Chat and Activity Constraints
DO $$
BEGIN
    -- 1. FIX USER ACTIVITY (Allow Company Admins to log activity)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_employee_id_fkey') THEN
        ALTER TABLE user_activity DROP CONSTRAINT user_activity_employee_id_fkey;
    END IF;

    -- 2. FIX CHAT CHANNELS (Allow Company Admins to create channels)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_channels_created_by_fkey') THEN
        ALTER TABLE chat_channels DROP CONSTRAINT chat_channels_created_by_fkey;
    END IF;

    -- 3. RESTORE INTERNAL RELATIONSHIPS (Fix PGRST200 / missing relationship error)
    -- This is crucial for the UI to load channels correctly
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

    -- 4. ENSURE CHAT USER STATUS IS OPEN (Already done mostly, but making sure)
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_user_status_status_check') THEN
        ALTER TABLE chat_user_status DROP CONSTRAINT chat_user_status_status_check;
    END IF;
    ALTER TABLE chat_user_status ADD CONSTRAINT chat_user_status_status_check 
    CHECK (status IN ('online', 'away', 'offline', 'break', 'idle', 'busy'));

END $$;

-- Reload the schema cache so PostgREST sees the restored relationships
NOTIFY pgrst, 'reload schema';
