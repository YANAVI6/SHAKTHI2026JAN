-- Migration: Add PAYMENT_RECEIVED to call_status check constraint
-- This allows payment recording to create call logs

-- Drop the existing constraint
ALTER TABLE case_call_logs DROP CONSTRAINT IF EXISTS case_call_logs_call_status_check;

-- Add the new constraint with PAYMENT_RECEIVED included
ALTER TABLE case_call_logs ADD CONSTRAINT case_call_logs_call_status_check 
  CHECK (call_status IN ('WN', 'SW', 'RNR', 'BUSY', 'CALL_BACK', 'PTP', 'FUTURE_PTP', 'BPTP', 'RTP', 'NC', 'CD', 'INC', 'PAYMENT_RECEIVED'));
