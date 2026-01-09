-- Migration to fix the case_status check constraint
-- The application uses 'assigned' status but the database constraint only allowed ['pending', 'in_progress', 'resolved', 'closed']

DO $$ 
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE public.customer_cases 
    DROP CONSTRAINT IF EXISTS customer_cases_case_status_check;

    -- Re-create the constraint with 'assigned' included
    -- We include all common statuses to be safe
    ALTER TABLE public.customer_cases 
    ADD CONSTRAINT customer_cases_case_status_check 
    CHECK (case_status = ANY (ARRAY[
        'pending'::text, 
        'assigned'::text, 
        'in_progress'::text, 
        'resolved'::text, 
        'closed'::text
    ]));
END $$;
