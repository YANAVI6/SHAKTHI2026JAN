/*
  ===============================================================================
  TABLE 13: telecaller_targets
  Performance targets for telecallers (calls and collections)
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS telecaller_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telecaller_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE UNIQUE,
  daily_calls_target integer DEFAULT 0 CHECK (daily_calls_target >= 0),
  weekly_calls_target integer DEFAULT 0 CHECK (weekly_calls_target >= 0),
  monthly_calls_target integer DEFAULT 0 CHECK (monthly_calls_target >= 0),
  daily_collections_target numeric DEFAULT 0 CHECK (daily_collections_target >= 0),
  weekly_collections_target numeric DEFAULT 0 CHECK (weekly_collections_target >= 0),
  monthly_collections_target numeric DEFAULT 0 CHECK (monthly_collections_target >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_telecaller_targets_telecaller_id
  ON telecaller_targets(telecaller_id);

-- Triggers
CREATE TRIGGER update_telecaller_targets_updated_at
  BEFORE UPDATE ON telecaller_targets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE telecaller_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read telecaller targets"
  ON telecaller_targets FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert telecaller targets"
  ON telecaller_targets FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update telecaller targets"
  ON telecaller_targets FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete telecaller targets"
  ON telecaller_targets FOR DELETE
  TO anon
  USING (true);
