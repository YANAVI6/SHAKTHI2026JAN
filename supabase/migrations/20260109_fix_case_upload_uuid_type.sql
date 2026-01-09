-- Migration to fix the assigned_employee_id type conflict during case upload
-- This column was defined as UUID but needs to store EMPID strings (e.g. 'EMP022') or 'UNASSIGNED'

DO $$ 
BEGIN
    -- Change the column type to text and make it nullable
    -- We use a cast via string for the type conversion
    ALTER TABLE public.customer_cases 
    ALTER COLUMN assigned_employee_id TYPE text,
    ALTER COLUMN assigned_employee_id DROP NOT NULL;

    -- Update indices if necessary (though they will auto-update their type in most cases)
    -- The index idx_customer_cases_employee was mentioned in the user's schema DDL
    -- No further action needed for indices as postgres handles type changes for B-Tree indices.
END $$;
