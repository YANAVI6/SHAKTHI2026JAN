-- Migration: Add callback fields to case_call_logs table
-- This allows telecallers to schedule callbacks with specific date and time

-- Add callback_date column
ALTER TABLE case_call_logs ADD COLUMN IF NOT EXISTS callback_date date;

-- Add callback_time column
ALTER TABLE case_call_logs ADD COLUMN IF NOT EXISTS callback_time time;

-- Add callback_completed column
ALTER TABLE case_call_logs ADD COLUMN IF NOT EXISTS callback_completed boolean DEFAULT false;

-- Add index for efficient callback queries
CREATE INDEX IF NOT EXISTS idx_call_logs_callback_date ON case_call_logs(callback_date) WHERE callback_completed = false;
