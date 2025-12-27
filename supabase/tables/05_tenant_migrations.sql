/*
  ===============================================================================
  TABLE 5: tenant_migrations
  Tracks schema migrations applied to each tenant database
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS tenant_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  migration_name text NOT NULL,
  migration_version text NOT NULL,
  applied_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text,

  UNIQUE(tenant_id, migration_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tenant_migrations_tenant_id ON tenant_migrations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_migrations_status ON tenant_migrations(status);

-- RLS
ALTER TABLE tenant_migrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to tenant migrations"
  ON tenant_migrations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to tenant migrations"
  ON tenant_migrations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update access to tenant migrations"
  ON tenant_migrations FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);
