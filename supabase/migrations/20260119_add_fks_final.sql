-- Add Foreign Keys to Partitioned case_call_logs Table
-- Must use supabase_admin as table owner

BEGIN;

-- Add foreign keys to the PARENT partitioned table
-- These will automatically propagate to all child partitions

ALTER TABLE case_call_logs 
ADD CONSTRAINT case_call_logs_case_id_fkey 
FOREIGN KEY (case_id) REFERENCES customer_cases(id) ON DELETE CASCADE;

ALTER TABLE case_call_logs 
ADD CONSTRAINT case_call_logs_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;

ALTER TABLE case_call_logs 
ADD CONSTRAINT case_call_logs_tenant_id_fkey 
FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

COMMIT;

-- Verify foreign keys were created
SELECT 
    conname AS constraint_name,
    contype AS type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'case_call_logs'::regclass
  AND contype = 'f'
ORDER BY conname;
