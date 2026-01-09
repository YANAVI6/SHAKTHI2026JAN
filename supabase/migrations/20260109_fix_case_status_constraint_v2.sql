-- Comprehensive migration to fix the case_status check constraint
-- This migration includes all possible statuses used by the application, including 'assigned' and 'deleted'

DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE public.customer_cases 
    DROP CONSTRAINT IF EXISTS customer_cases_case_status_check;

    -- Re-create the constraint with a comprehensive list of allowed statuses
    -- This includes 'assigned' (for uploads) and 'deleted' (for soft deletes)
    ALTER TABLE public.customer_cases 
    ADD CONSTRAINT customer_cases_case_status_check 
    CHECK (case_status = ANY (ARRAY[
        'pending'::text, 
        'assigned'::text, 
        'in_progress'::text, 
        'resolved'::text, 
        'closed'::text,
        'deleted'::text,
        'new'::text
    ]));
END $$;
