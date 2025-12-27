/*
  ===============================================================================
  TABLE 8: column_configurations
  Stores dynamic column configuration created by Company Admin
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS column_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  column_name text NOT NULL,
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  is_custom boolean DEFAULT false,
  column_order integer DEFAULT 0,
  data_type text DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'phone', 'currency', 'email', 'url')),
  product_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, column_name, product_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_column_config_tenant ON column_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_column_config_active ON column_configurations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_column_config_order ON column_configurations(tenant_id, column_order);
CREATE INDEX IF NOT EXISTS idx_column_config_product_name ON column_configurations(tenant_id, product_name);

-- Triggers
CREATE TRIGGER update_column_configurations_updated_at
  BEFORE UPDATE ON column_configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE column_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read column configurations"
  ON column_configurations FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert column configurations"
  ON column_configurations FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update column configurations"
  ON column_configurations FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon delete column configurations"
  ON column_configurations FOR DELETE
  TO anon
  USING (true);
