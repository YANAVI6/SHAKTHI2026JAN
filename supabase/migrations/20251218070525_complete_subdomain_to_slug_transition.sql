/*
  # Complete subdomain to slug transition

  ## Summary
  This migration completes the transition from using `subdomain` to `slug` as the
  primary tenant identifier in the tenants table.

  ## Changes Made
  1. Data Updates
    - Clear all existing slug values (as per requirements)

  2. Subdomain Column
    - Make subdomain column nullable (transitioning away from it)
    - Drop subdomain unique constraint (will be replaced by slug)
    - Drop subdomain check constraints

  3. Slug Column
    - Add check constraint for slug format (3-63 chars, alphanumeric with hyphens)
    - Ensure unique constraint exists
    - Add trigger to normalize slug to lowercase

  ## Validation Rules for Slug
  - Length: 3-63 characters
  - Format: alphanumeric with hyphens only
  - Must start and end with alphanumeric character
  - Case insensitive (stored in lowercase)
*/

-- Step 1: Clear existing slug values as requested
UPDATE tenants SET slug = NULL;

-- Step 2: Make subdomain nullable (transition phase)
ALTER TABLE tenants ALTER COLUMN subdomain DROP NOT NULL;

-- Step 3: Drop subdomain-related constraints
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_subdomain_key;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_subdomain_format;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_subdomain_length;
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_subdomain_not_empty;

-- Step 4: Ensure slug unique constraint exists (should already exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tenants_slug_key'
  ) THEN
    ALTER TABLE tenants ADD CONSTRAINT tenants_slug_key UNIQUE (slug);
  END IF;
END $$;

-- Step 5: Add check constraint for slug format
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS check_slug_format;
ALTER TABLE tenants ADD CONSTRAINT check_slug_format
  CHECK (
    slug IS NULL OR (
      char_length(slug) >= 3 AND
      char_length(slug) <= 63 AND
      slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    )
  );

-- Step 6: Add trigger to ensure slug is always lowercase
CREATE OR REPLACE FUNCTION normalize_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NOT NULL THEN
    NEW.slug = lower(trim(NEW.slug));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_normalize_slug ON tenants;
CREATE TRIGGER trigger_normalize_slug
  BEFORE INSERT OR UPDATE OF slug ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION normalize_slug();

-- Step 7: Add index on slug if not exists
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- Step 8: Add comment to document the column
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier for the tenant (3-63 chars, alphanumeric with hyphens, lowercase)';
COMMENT ON COLUMN tenants.subdomain IS 'DEPRECATED: Use slug instead. Will be removed in future migration.';