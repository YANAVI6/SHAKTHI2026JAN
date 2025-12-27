/*
  ===============================================================================
  TABLE 9: customer_cases
  Stores all customer loan recovery cases
  ===============================================================================
*/

CREATE TABLE IF NOT EXISTS customer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Assignment
  assigned_employee_id text NOT NULL,
  team_id uuid REFERENCES teams(id) ON DELETE SET NULL,
  telecaller_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  product_name text,

  -- Core Case Information
  loan_id text NOT NULL,
  customer_name text NOT NULL,
  mobile_no text,
  alternate_number text,
  email text,

  -- Loan Details
  loan_amount text,
  loan_type text,
  outstanding_amount text,
  pos_amount text,
  emi_amount text,
  pending_dues text,
  dpd integer,

  -- Branch and Location
  branch_name text,
  address text,
  city text,
  state text,
  pincode text,

  -- Dates
  sanction_date date,
  last_paid_date date,
  last_paid_amount text,

  -- Payment
  payment_link text,

  -- Additional Fields
  remarks text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  case_data jsonb DEFAULT '{}'::jsonb,

  -- Case Management
  case_status text DEFAULT 'pending' CHECK (case_status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  last_call_date timestamptz,
  next_action_date timestamptz,
  total_collected_amount numeric DEFAULT 0,

  -- Metadata
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  UNIQUE(tenant_id, loan_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_cases_tenant ON customer_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_employee ON customer_cases(tenant_id, assigned_employee_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_team_id ON customer_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_telecaller_id ON customer_cases(telecaller_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_product_name ON customer_cases(product_name);
CREATE INDEX IF NOT EXISTS idx_customer_cases_loan_id ON customer_cases(tenant_id, loan_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_status ON customer_cases(case_status);
CREATE INDEX IF NOT EXISTS idx_customer_cases_dpd ON customer_cases(dpd);

-- Triggers
CREATE TRIGGER update_customer_cases_updated_at
  BEFORE UPDATE ON customer_cases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE customer_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read customer cases"
  ON customer_cases FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert customer cases"
  ON customer_cases FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update customer cases"
  ON customer_cases FOR UPDATE
  TO anon
  USING (true);

CREATE POLICY "Allow anon delete customer cases"
  ON customer_cases FOR DELETE
  TO anon
  USING (true);
