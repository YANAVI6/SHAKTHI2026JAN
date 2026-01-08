-- Fix amount_collected column type from text to numeric
-- This migration converts the amount_collected column from text to numeric
-- to prevent string concatenation issues and ensure proper numeric aggregation

-- Step 1: Add a new numeric column
ALTER TABLE case_call_logs 
ADD COLUMN amount_collected_numeric numeric(15, 2);

-- Step 2: Migrate existing data, converting text to numeric
-- Handle NULL and empty string cases
UPDATE case_call_logs 
SET amount_collected_numeric = CASE 
  WHEN amount_collected IS NULL OR amount_collected = '' THEN 0
  ELSE CAST(amount_collected AS numeric(15, 2))
END;

-- Step 3: Drop the old text column
ALTER TABLE case_call_logs 
DROP COLUMN amount_collected;

-- Step 4: Rename the new column to the original name
ALTER TABLE case_call_logs 
RENAME COLUMN amount_collected_numeric TO amount_collected;

-- Step 5: Add NOT NULL constraint if needed (optional, based on your requirements)
-- ALTER TABLE case_call_logs 
-- ALTER COLUMN amount_collected SET NOT NULL;

-- Step 6: Add a check constraint to ensure non-negative amounts
ALTER TABLE case_call_logs 
ADD CONSTRAINT amount_collected_non_negative CHECK (amount_collected >= 0);
