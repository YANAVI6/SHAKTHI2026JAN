-- Migration: Add missing break tracking and idle columns to user_activity

-- 1. Add missing columns safely
ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS current_break_start TIMESTAMP WITH TIME ZONE;
ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS total_idle_time INTEGER DEFAULT 0;
ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS total_break_time INTEGER DEFAULT 0;
ALTER TABLE user_activity ADD COLUMN IF NOT EXISTS logout_reason VARCHAR(100);

-- 2. Add comments for documentation
COMMENT ON COLUMN user_activity.current_break_start IS 'Timestamp when current break started (NULL if not on break)';
COMMENT ON COLUMN user_activity.total_idle_time IS 'Total accumulated idle time in minutes for this session';
COMMENT ON COLUMN user_activity.total_break_time IS 'Total accumulated break time in minutes for this session';
COMMENT ON COLUMN user_activity.logout_reason IS 'Reason for telecaller logout (e.g., manual, timeout, end of day)';
