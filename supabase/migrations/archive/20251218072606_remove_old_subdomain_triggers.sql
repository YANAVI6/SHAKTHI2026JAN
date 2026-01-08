/*
  # Remove Old Subdomain Triggers and Functions

  This migration removes the old subdomain validation triggers and functions
  that are no longer needed after transitioning to the slug column.

  1. Changes
    - Drop old subdomain validation triggers
    - Drop old subdomain validation functions
    - Keep slug normalization triggers

  2. Security
    - No RLS changes needed
*/

-- Drop old subdomain triggers
DROP TRIGGER IF EXISTS trigger_normalize_validate_subdomain_insert ON tenants;
DROP TRIGGER IF EXISTS trigger_normalize_validate_subdomain_update ON tenants;

-- Drop old subdomain validation function
DROP FUNCTION IF EXISTS normalize_and_validate_subdomain();
DROP FUNCTION IF EXISTS validate_subdomain_format(text);
