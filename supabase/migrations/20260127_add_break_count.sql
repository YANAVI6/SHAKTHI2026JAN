-- Add break_count column to user_activity table
ALTER TABLE public.user_activity 
ADD COLUMN IF NOT EXISTS break_count INTEGER DEFAULT 0;
