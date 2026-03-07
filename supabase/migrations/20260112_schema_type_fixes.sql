-- Migration: Safe Schema Optimization (Data Types & Indexes)
-- Created: 2026-01-12

-- 1. Safe Conversion of Text -> Numeric
-- We use a robust regex to strip non-numeric characters before casting
-- This prevents crashes on values like "₹ 1,500" or "$200.00"

DO $$ 
BEGIN
  -- Handle loan_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'loan_amount' AND data_type = 'text') THEN
    ALTER TABLE customer_cases 
    ALTER COLUMN loan_amount TYPE numeric(15,2) 
    USING NULLIF(regexp_replace(loan_amount, '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  -- Handle outstanding_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'outstanding_amount' AND data_type = 'text') THEN
    ALTER TABLE customer_cases 
    ALTER COLUMN outstanding_amount TYPE numeric(15,2) 
    USING NULLIF(regexp_replace(outstanding_amount, '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  -- Handle emi_amount
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'emi_amount' AND data_type = 'text') THEN
    ALTER TABLE customer_cases 
    ALTER COLUMN emi_amount TYPE numeric(15,2) 
    USING NULLIF(regexp_replace(emi_amount, '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  -- Handle pending_dues (if applicable)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'pending_dues' AND data_type = 'text') THEN
    ALTER TABLE customer_cases 
    ALTER COLUMN pending_dues TYPE numeric(15,2) 
    USING NULLIF(regexp_replace(pending_dues, '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  -- Handle pos_amount (if applicable)
   IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'pos_amount' AND data_type = 'text') THEN
    ALTER TABLE customer_cases 
    ALTER COLUMN pos_amount TYPE numeric(15,2) 
    USING NULLIF(regexp_replace(pos_amount, '[^0-9.]', '', 'g'), '')::numeric;
  END IF;

  -- Handle last_paid_amount (if applicable)
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'last_paid_amount' AND data_type = 'text') THEN
    ALTER TABLE customer_cases 
    ALTER COLUMN last_paid_amount TYPE numeric(15,2) 
    USING NULLIF(regexp_replace(last_paid_amount, '[^0-9.]', '', 'g'), '')::numeric;
  END IF;
  
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error during safe conversion: %', SQLERRM;
END $$;


-- 2. Performance Indexes (Composite)
-- These indexes are critical for the Live Monitoring and Dashboard counts

CREATE INDEX IF NOT EXISTS idx_cases_tenant_team_status 
ON customer_cases (tenant_id, team_id, case_status);

CREATE INDEX IF NOT EXISTS idx_cases_tenant_telecaller_status 
ON customer_cases (tenant_id, telecaller_id, case_status);

-- Specific index for "Live Monitoring" (Finding today's logs fast)
CREATE INDEX IF NOT EXISTS idx_call_logs_created_tenant_composite
ON case_call_logs (created_at DESC, tenant_id);

-- Reload Schema Cache to apply changes
NOTIFY pgrst, 'reload schema';
