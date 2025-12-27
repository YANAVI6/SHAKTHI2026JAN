-- Migration: Add logout_reason column to user_activity table
-- This allows tracking why a user logged out (manual vs auto-logout)

-- Add logout_reason column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity' 
        AND column_name = 'logout_reason'
    ) THEN
        ALTER TABLE user_activity 
        ADD COLUMN logout_reason VARCHAR(100);
    END IF;
END $$;

-- Add current_break_start column if it doesn't exist (for break tracking)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_activity' 
        AND column_name = 'current_break_start'
    ) THEN
        ALTER TABLE user_activity 
        ADD COLUMN current_break_start TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
