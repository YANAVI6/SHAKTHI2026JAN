/*
  ===============================================================================
  TABLE 1: super_admins
  Super administrator authentication table
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_super_admins_username ON super_admins(username);

-- Triggers
CREATE TRIGGER update_super_admins_updated_at
  BEFORE UPDATE ON super_admins
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anonymous select for authentication"
  ON super_admins FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow insert for super admins"
  ON super_admins FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
