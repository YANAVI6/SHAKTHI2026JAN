-- Fix missing foreign keys on case_call_logs table
-- This is required after partitioning migration

BEGIN;

-- Add foreign key constraints if they don't exist
DO $$ 
BEGIN
    -- Add case_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'case_call_logs_case_id_fkey'
    ) THEN
        ALTER TABLE case_call_logs 
        ADD CONSTRAINT case_call_logs_case_id_fkey 
        FOREIGN KEY (case_id) REFERENCES customer_cases(id) ON DELETE CASCADE;
    END IF;

    -- Add employee_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'case_call_logs_employee_id_fkey'
    ) THEN
        ALTER TABLE case_call_logs 
        ADD CONSTRAINT case_call_logs_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;

    -- Add tenant_id foreign key
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'case_call_logs_tenant_id_fkey'
    ) THEN
        ALTER TABLE case_call_logs 
        ADD CONSTRAINT case_call_logs_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_call_logs_case_id ON case_call_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_employee_id ON case_call_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant_id ON case_call_logs(tenant_id);

COMMIT;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
