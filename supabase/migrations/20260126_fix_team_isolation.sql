-- Migration: Fix Team Isolation
-- Date: 2026-01-26
-- Description: Allow same loan_id to exist in different teams

BEGIN;

-- Drop old unique constraint
ALTER TABLE customer_cases DROP CONSTRAINT IF EXISTS customer_cases_tenant_id_loan_id_key;

-- Add new unique constraint with team_id
ALTER TABLE customer_cases ADD CONSTRAINT customer_cases_tenant_team_loan_unique 
  UNIQUE (tenant_id, team_id, loan_id);

COMMIT;

-- Verify the change
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(c.oid) as constraint_definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname = 'customer_cases' 
  AND contype = 'u';
