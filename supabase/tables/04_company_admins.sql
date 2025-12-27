/*
  ===============================================================================
  TABLE 4: company_admins
  Administrators who manage individual tenant/company
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS company_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Admin Details
  name text NOT NULL,
  employee_id text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,

  -- Status and Role
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role text DEFAULT 'CompanyAdmin',

  -- Authentication
  last_login_at timestamptz,
  password_reset_token text,
  password_reset_expires timestamptz,

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES super_admins(id) ON DELETE SET NULL,

  UNIQUE(tenant_id, employee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_admins_tenant_id ON company_admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_admins_email ON company_admins(email);
CREATE INDEX IF NOT EXISTS idx_company_admins_status ON company_admins(status);

-- Triggers
CREATE TRIGGER update_company_admins_updated_at
  BEFORE UPDATE ON company_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE company_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to company admins"
  ON company_admins FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to company admins"
  ON company_admins FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update access to company admins"
  ON company_admins FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete access to company admins"
  ON company_admins FOR DELETE
  TO anon
  USING (true);
