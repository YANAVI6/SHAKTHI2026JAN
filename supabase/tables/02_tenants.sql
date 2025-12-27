/*
  ===============================================================================
  TABLE 2: tenants
  Central registry of all companies/tenants in the system
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),

  -- Company Details
  proprietor_name text,
  phone_number text,
  email text,
  address text,
  gst_number text,
  pan_number text,
  city text,
  state text,
  pincode text,

  -- Subscription and Limits
  plan text DEFAULT 'basic' CHECK (plan IN ('basic', 'standard', 'premium', 'enterprise')),
  max_users integer DEFAULT 10,
  max_connections integer DEFAULT 5,

  -- Settings
  settings jsonb DEFAULT '{"branding": {}, "features": {"voip": false, "sms": false, "analytics": true, "apiAccess": false}}'::jsonb,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES super_admins(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT check_subdomain_not_empty CHECK (LENGTH(TRIM(subdomain)) > 0),
  CONSTRAINT check_subdomain_length CHECK (LENGTH(subdomain) >= 3 AND LENGTH(subdomain) <= 63),
  CONSTRAINT check_subdomain_format CHECK (subdomain ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$')
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain_lower ON tenants(LOWER(subdomain));
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_status ON tenants(LOWER(subdomain), status);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);

-- Triggers
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_normalize_validate_subdomain_insert
  BEFORE INSERT ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION normalize_and_validate_subdomain();

CREATE TRIGGER trigger_normalize_validate_subdomain_update
  BEFORE UPDATE OF subdomain ON tenants
  FOR EACH ROW
  EXECUTE FUNCTION normalize_and_validate_subdomain();

-- RLS
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to tenants"
  ON tenants FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to tenants"
  ON tenants FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update access to tenants"
  ON tenants FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete access to tenants"
  ON tenants FOR DELETE
  TO anon
  USING (true);
