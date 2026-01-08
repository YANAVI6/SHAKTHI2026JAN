-- Add missing columns to customer_cases for better filtering and tracking
ALTER TABLE customer_cases ADD COLUMN IF NOT EXISTS latest_call_status TEXT;
ALTER TABLE customer_cases ADD COLUMN IF NOT EXISTS latest_ptp_date TIMESTAMPTZ;
ALTER TABLE customer_cases ADD COLUMN IF NOT EXISTS latest_call_date TIMESTAMPTZ;
ALTER TABLE customer_cases ADD COLUMN IF NOT EXISTS latest_call_notes TEXT;

-- Move status to in_progress for consistency
ALTER TABLE customer_cases ALTER COLUMN case_status SET DEFAULT 'pending';
