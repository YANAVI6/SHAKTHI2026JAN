/*
  # Fix PTP Date Column Type
  
  ## Problem
  The `ptp_date` column in `case_call_logs` table is currently type `date` which only stores dates without time information. This causes the time portion of PTP dates to be lost when saved.
  
  ## Changes
  1. Change `ptp_date` column type from `date` to `timestamptz` (timestamp with timezone)
  2. This allows storing both date and time with timezone information
  3. Existing date values will be automatically converted to timestamps at midnight UTC
  
  ## Impact
  - All existing PTP dates will be preserved as midnight UTC timestamps
  - New PTP dates will store complete datetime information with timezone
  - Display logic can now properly show local time to users
*/

-- Change the ptp_date column type from date to timestamptz
ALTER TABLE case_call_logs 
ALTER COLUMN ptp_date TYPE timestamptz USING ptp_date::timestamptz;