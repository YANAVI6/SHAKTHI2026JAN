/*
  ===============================================================================
  TABLE 16: case_views
  Tracks which cases have been viewed by which users
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS case_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  user_id text NOT NULL, -- Can be employee ID, user ID, or any string identifier
  viewed_at timestamptz DEFAULT now(),
  
  -- Ensure each user can only mark a case as viewed once
  UNIQUE(case_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_views_case_id ON case_views(case_id);
CREATE INDEX IF NOT EXISTS idx_case_views_user_id ON case_views(user_id);
CREATE INDEX IF NOT EXISTS idx_case_views_viewed_at ON case_views(viewed_at);

-- RLS
ALTER TABLE case_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read access to case views"
  ON case_views FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert access to case views"
  ON case_views FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update access to case views"
  ON case_views FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon delete access to case views"
  ON case_views FOR DELETE
  TO anon
  USING (true);
