-- Force removal of foreign key constraints to employees table for chat status and typing
-- This is necessary to allow CompanyAdmins and SuperAdmins to use chat features
-- as they reside in different tables than 'employees'.

DO $$ 
BEGIN
    -- Drop constraints for chat_user_status
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_user_status_user_id_fkey') THEN
        ALTER TABLE chat_user_status DROP CONSTRAINT chat_user_status_user_id_fkey;
    END IF;

    -- Drop constraints for chat_typing_indicators
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_typing_indicators_user_id_fkey') THEN
        ALTER TABLE chat_typing_indicators DROP CONSTRAINT chat_typing_indicators_user_id_fkey;
    END IF;

    -- Drop constraints for chat_channel_members
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_channel_members_user_id_fkey') THEN
        ALTER TABLE chat_channel_members DROP CONSTRAINT chat_channel_members_user_id_fkey;
    END IF;

    -- Drop constraints for chat_messages
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'chat_messages_sender_id_fkey') THEN
        ALTER TABLE chat_messages DROP CONSTRAINT chat_messages_sender_id_fkey;
    END IF;
    
    -- Ensure chat_user_status has the correct check constraint for all statuses
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_user_status_status_check') THEN
        ALTER TABLE chat_user_status DROP CONSTRAINT chat_user_status_status_check;
    END IF;
    ALTER TABLE chat_user_status ADD CONSTRAINT chat_user_status_status_check CHECK (status IN ('online', 'away', 'offline', 'break', 'idle', 'busy'));

    -- Ensure chat_user_status has user_id as PRIMARY KEY (which provides the unique constraint for upsert)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'chat_user_status' AND constraint_type = 'PRIMARY KEY') THEN
        ALTER TABLE chat_user_status ADD PRIMARY KEY (user_id);
    END IF;

END $$;
