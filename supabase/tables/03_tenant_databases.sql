/*
  ===============================================================================
  TABLE 3: tenant_databases
  Stores connection information for each tenant's database
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS tenant_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Database Connection Info
  database_url text NOT NULL,
  database_name text NOT NULL,
  host text NOT NULL,
  port integer DEFAULT 5432,

  -- Health Monitoring
  status text DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'provisioning')),
  last_health_check timestamptz,
  schema_version text DEFAULT '1.0.0',

  -- Metadata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_databases_tenant_id ON tenant_databases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_databases_status ON tenant_databases(status);

-- Triggers
CREATE TRIGGER update_tenant_databases_updated_at
  BEFORE UPDATE ON tenant_databases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE tenant_databases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to tenant databases"
  ON tenant_databases FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to tenant databases"
  ON tenant_databases FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update access to tenant databases"
  ON tenant_databases FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete access to tenant databases"
  ON tenant_databases FOR DELETE
  TO anon
  USING (true);
