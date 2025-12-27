/*
  ===============================================================================
  TABLE 10: case_call_logs
  Tracks all call interactions for each case
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS case_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  employee_id text NOT NULL,

  -- Call Details
  call_status text NOT NULL CHECK (call_status IN ('WN', 'SW', 'RNR', 'BUSY', 'CALL_BACK', 'PTP', 'FUTURE_PTP', 'BPTP', 'RTP', 'NC', 'CD', 'INC', 'PAYMENT_RECEIVED')),
  ptp_date date,
  call_notes text,
  call_duration integer DEFAULT 0,

  -- Call Result
  call_result text,
  amount_collected text,

  -- Callback scheduling
  callback_date date,
  callback_time time,
  callback_completed boolean DEFAULT false,

  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_call_logs_tenant ON case_call_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_case ON case_call_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_employee ON case_call_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_call_logs_created ON case_call_logs(created_at);

-- RLS
ALTER TABLE case_call_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read call logs"
  ON case_call_logs FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert call logs"
  ON case_call_logs FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update call logs"
  ON case_call_logs FOR UPDATE
  TO anon
  USING (true);
