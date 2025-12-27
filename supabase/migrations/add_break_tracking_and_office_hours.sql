-- Migration: Add break tracking and office hours support
-- This migration adds columns to track breaks and idle time accurately

-- 1. Add break tracking columns to user_activity table
ALTER TABLE user_activity 
ADD COLUMN IF NOT EXISTS current_break_start TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS total_idle_time INTEGER DEFAULT 0; -- in minutes

-- 2. Create office_settings table for tenant-specific office hours
CREATE TABLE IF NOT EXISTS office_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  office_start_time TIME NOT NULL DEFAULT '09:00:00',
  office_end_time TIME NOT NULL DEFAULT '18:00:00',
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  working_days INTEGER[] DEFAULT ARRAY[1,2,3,4,5,6], -- 0=Sunday, 1=Monday, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_office_settings_tenant_id ON office_settings(tenant_id);

-- 4. Enable RLS on office_settings
ALTER TABLE office_settings ENABLE ROW LEVEL SECURITY;

-- 5. Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow anon read office_settings" ON office_settings;
DROP POLICY IF EXISTS "Allow anon insert office_settings" ON office_settings;
DROP POLICY IF EXISTS "Allow anon update office_settings" ON office_settings;

-- 6. Create policies for office_settings
CREATE POLICY "Allow anon read office_settings"
  ON office_settings FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert office_settings"
  ON office_settings FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update office_settings"
  ON office_settings FOR UPDATE
  TO anon
  USING (true);

-- 7. Add comment
COMMENT ON TABLE office_settings IS 'Stores office hours configuration for each tenant';
COMMENT ON COLUMN user_activity.current_break_start IS 'Timestamp when current break started (NULL if not on break)';
COMMENT ON COLUMN user_activity.total_idle_time IS 'Total accumulated idle time in minutes for this session';
