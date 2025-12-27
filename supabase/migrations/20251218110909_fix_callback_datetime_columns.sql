/*
  # Fix Callback Date/Time Columns
  
  ## Problem
  The callback date and time are stored in separate columns:
  - `callback_date` (type `date`) - only stores date without time
  - `callback_time` (type `time without time zone`) - only stores time without date/timezone
  
  This causes timezone issues and makes it difficult to work with callback datetimes properly.
  
  ## Changes
  1. Change `callback_date` column type from `date` to `timestamptz` (timestamp with timezone)
  2. Drop the `callback_time` column since time is now included in `callback_date`
  3. Rename `callback_date` to `callback_datetime` for clarity
  
  ## Impact
  - Existing callback_date values will be converted to midnight UTC timestamps
  - callback_time data will be lost (acceptable as this is a fix for broken functionality)
  - New callbacks will store complete datetime information with timezone
  - Display logic can properly show local time to users
*/

-- First, convert callback_date to timestamptz
ALTER TABLE case_call_logs 
ALTER COLUMN callback_date TYPE timestamptz USING callback_date::timestamptz;

-- Rename callback_date to callback_datetime for clarity
ALTER TABLE case_call_logs 
RENAME COLUMN callback_date TO callback_datetime;

-- Drop the separate callback_time column as it's no longer needed
ALTER TABLE case_call_logs 
DROP COLUMN IF EXISTS callback_time;