/*
  ===============================================================================
  TABLE 11: teams
  Team management for organizing telecallers
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  team_incharge_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  product_name text NOT NULL DEFAULT 'General',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid,
  UNIQUE(tenant_id, name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_incharge_id ON teams(team_incharge_id);
CREATE INDEX IF NOT EXISTS idx_teams_status ON teams(status);
CREATE INDEX IF NOT EXISTS idx_teams_product_name ON teams(product_name);

-- Triggers
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON teams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read teams"
  ON teams FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert teams"
  ON teams FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update teams"
  ON teams FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete teams"
  ON teams FOR DELETE
  TO anon
  USING (true);
