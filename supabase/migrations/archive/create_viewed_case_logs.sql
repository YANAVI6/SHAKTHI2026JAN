-- Migration: Create viewed_case_logs table
-- This table tracks which cases have been viewed by telecallers
-- Used for highlighting new/unviewed cases in the dashboard

CREATE TABLE IF NOT EXISTS viewed_case_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  
  UNIQUE(case_id, employee_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_employee ON viewed_case_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_case ON viewed_case_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_viewed_at ON viewed_case_logs(viewed_at);

-- RLS
ALTER TABLE viewed_case_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read viewed case logs"
  ON viewed_case_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert viewed case logs"
  ON viewed_case_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update viewed case logs"
  ON viewed_case_logs FOR UPDATE
  TO anon
  USING (true);
