-- Migration: Add total_idle_time to user_activity
-- Purpose: Track accumulated idle time per session

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'user_activity' 
        AND column_name = 'total_idle_time'
    ) THEN 
        ALTER TABLE user_activity 
        ADD COLUMN total_idle_time INTEGER DEFAULT 0; -- in minutes
    END IF;
END $$;
