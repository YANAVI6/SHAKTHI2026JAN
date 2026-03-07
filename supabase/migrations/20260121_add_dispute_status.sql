-- Migration: Add 'DISPUTE' to allowed call statuses
-- Description: Updates the check constraint on case_call_logs.call_status to include 'DISPUTE'

BEGIN;

-- 1. Drop the existing constraint
ALTER TABLE case_call_logs
DROP CONSTRAINT IF EXISTS case_call_logs_call_status_check;

-- 2. Add the updated constraint with 'DISPUTE' included
ALTER TABLE case_call_logs
ADD CONSTRAINT case_call_logs_call_status_check 
CHECK (call_status = ANY (ARRAY[
  'WN'::text, 
  'SW'::text, 
  'RNR'::text, 
  'BUSY'::text, 
  'CALL_BACK'::text, 
  'PTP'::text, 
  'FUTURE_PTP'::text, 
  'BPTP'::text, 
  'RTP'::text, 
  'NC'::text, 
  'CD'::text, 
  'INC'::text, 
  'PAYMENT_RECEIVED'::text,
  'DISPUTE'::text  -- Newly added status
]));

COMMIT;
