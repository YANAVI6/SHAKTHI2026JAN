-- Migration to add is_retained column to customer_cases
-- This allows marking cases to be kept for the next month

ALTER TABLE public.customer_cases 
ADD COLUMN IF NOT EXISTS is_retained BOOLEAN DEFAULT false;

-- Add a comment for clarity
COMMENT ON COLUMN public.customer_cases.is_retained IS 'Flag to mark cases that should be retained for next month collection';
