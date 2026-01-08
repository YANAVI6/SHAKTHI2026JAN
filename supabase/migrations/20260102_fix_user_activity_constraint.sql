-- Fix user_activity table to prevent duplicate records
-- Add unique constraint on (tenant_id, employee_id) to ensure one active session per user

-- First, clean up any duplicate records (keep the most recent one)
DELETE FROM user_activity a
USING user_activity b
WHERE a.id < b.id
  AND a.tenant_id = b.tenant_id
  AND a.employee_id = b.employee_id;

-- Add unique constraint to prevent future duplicates
-- This ensures only one activity record per employee per tenant
ALTER TABLE user_activity
ADD CONSTRAINT user_activity_tenant_employee_unique 
UNIQUE (tenant_id, employee_id);

-- Add comment for documentation
COMMENT ON CONSTRAINT user_activity_tenant_employee_unique ON user_activity IS 
'Ensures only one activity record exists per employee per tenant. Use UPSERT pattern for updates.';
