/*
  Complete Database Setup for Shakti CRM

  This migration creates all tables and initial data needed for the CRM system.

  IMPORTANT: Run this in Supabase SQL Editor to set up your database.

  Tables Created:
  1. super_admins - System administrators
  2. tenants - Company/organization accounts
  3. tenant_databases - Database connection info
  4. company_admins - Company administrators
  5. tenant_migrations - Migration tracking
  6. audit_logs - System audit trail
  7. employees - Team leaders and telecallers
  8. teams - Team structure
  9. column_configurations - Custom column settings
  10. customer_cases - Customer cases/leads
  11. case_call_logs - Call history
  12. team_telecallers - Team member assignments
  13. telecaller_targets - Performance targets
  14. notifications - In-app notifications
  15. user_activity - Activity tracking
  16. viewed_case_logs - Case view history
  17. case_views - Case viewing tracking
  18. office_settings - Office timing settings
  19. security_audit_logs - Security events
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. SUPER ADMINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_super_admins_username ON super_admins(username);

-- ============================================================================
-- 2. TENANTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE,
  slug text UNIQUE,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  proprietor_name text,
  phone_number text,
  email text,
  address text,
  gst_number text,
  pan_number text,
  city text,
  state text,
  pincode text,
  plan text DEFAULT 'basic' CHECK (plan IN ('basic', 'standard', 'premium', 'enterprise')),
  max_users integer DEFAULT 10,
  max_connections integer DEFAULT 5,
  settings jsonb DEFAULT '{"branding": {}, "features": {"sms": false, "voip": false, "analytics": true, "apiAccess": false}}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES super_admins(id),
  CONSTRAINT slug_format CHECK (
    slug IS NULL OR (
      char_length(slug) >= 3 AND
      char_length(slug) <= 63 AND
      slug ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$'
    )
  )
);

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

COMMENT ON COLUMN tenants.subdomain IS 'DEPRECATED: Use slug instead. Will be removed in future migration.';
COMMENT ON COLUMN tenants.slug IS 'URL-friendly identifier for the tenant (3-63 chars, alphanumeric with hyphens, lowercase)';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- ============================================================================
-- 3. TENANT DATABASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_databases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE REFERENCES tenants(id) ON DELETE CASCADE,
  database_url text NOT NULL,
  database_name text NOT NULL,
  host text NOT NULL,
  port integer DEFAULT 5432,
  status text DEFAULT 'healthy' CHECK (status IN ('healthy', 'degraded', 'down', 'provisioning')),
  last_health_check timestamptz,
  schema_version text DEFAULT '1.0.0',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE tenant_databases ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. COMPANY ADMINS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS company_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  employee_id text NOT NULL,
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  role text DEFAULT 'CompanyAdmin',
  last_login_at timestamptz,
  password_reset_token text,
  password_reset_expires timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES super_admins(id)
);

ALTER TABLE company_admins ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_admins_tenant_id ON company_admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_admins_email ON company_admins(email);

-- ============================================================================
-- 5. TENANT MIGRATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS tenant_migrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  migration_name text NOT NULL,
  migration_version text NOT NULL,
  applied_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message text
);

ALTER TABLE tenant_migrations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  user_type text CHECK (user_type IN ('SuperAdmin', 'CompanyAdmin')),
  action text NOT NULL,
  resource_type text,
  resource_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create index
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- 7. EMPLOYEES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  mobile text NOT NULL,
  emp_id text NOT NULL,
  password_hash text NOT NULL,
  role text NOT NULL CHECK (role IN ('TeamIncharge', 'Telecaller')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES company_admins(id),
  team_id uuid
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(emp_id);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);

-- ============================================================================
-- 8. TEAMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  team_incharge_id uuid REFERENCES employees(id),
  product_name text DEFAULT 'General',
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid
);

-- Add foreign key constraint to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employees_team_id_fkey'
  ) THEN
    ALTER TABLE employees
    ADD CONSTRAINT employees_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id);
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_incharge_id ON teams(team_incharge_id);

-- ============================================================================
-- 9. COLUMN CONFIGURATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS column_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  column_name text NOT NULL,
  display_name text NOT NULL,
  is_active boolean DEFAULT true,
  is_custom boolean DEFAULT false,
  column_order integer DEFAULT 0,
  data_type text DEFAULT 'text' CHECK (data_type IN ('text', 'number', 'date', 'phone', 'currency', 'email', 'url')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  product_name text
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_column_configurations_tenant_id ON column_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_column_configurations_product_name ON column_configurations(product_name);

-- ============================================================================
-- 10. CUSTOMER CASES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assigned_employee_id text,
  loan_id text NOT NULL,
  customer_name text NOT NULL,
  mobile_no text,
  alternate_number text,
  email text,
  loan_amount text,
  loan_type text,
  outstanding_amount text,
  pos_amount text,
  emi_amount text,
  pending_dues text,
  dpd integer,
  branch_name text,
  address text,
  city text,
  state text,
  pincode text,
  sanction_date date,
  last_paid_date date,
  last_paid_amount text,
  payment_link text,
  remarks text,
  custom_fields jsonb DEFAULT '{}'::jsonb,
  case_status text DEFAULT 'pending' CHECK (case_status IN ('pending', 'in_progress', 'resolved', 'closed')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  uploaded_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  team_id uuid REFERENCES teams(id),
  telecaller_id uuid REFERENCES employees(id),
  last_call_date timestamptz,
  next_action_date timestamptz,
  total_collected_amount numeric DEFAULT 0,
  case_data jsonb DEFAULT '{}'::jsonb,
  product_name text,
  status text DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Pending'))
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_cases_tenant_id ON customer_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_telecaller_id ON customer_cases(telecaller_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_team_id ON customer_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_loan_id ON customer_cases(loan_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_status ON customer_cases(status);
CREATE INDEX IF NOT EXISTS idx_customer_cases_product_name ON customer_cases(product_name);

-- ============================================================================
-- 11. CASE CALL LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  employee_id text NOT NULL,
  call_status text NOT NULL CHECK (call_status IN ('WN', 'SW', 'RNR', 'BUSY', 'CALL_BACK', 'PTP', 'FUTURE_PTP', 'BPTP', 'RTP', 'NC', 'CD', 'INC', 'PAYMENT_RECEIVED')),
  ptp_date timestamptz,
  call_notes text,
  call_duration integer DEFAULT 0,
  call_result text,
  created_at timestamptz DEFAULT now(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  callback_datetime timestamptz,
  callback_completed boolean DEFAULT false,
  amount_collected numeric CHECK (amount_collected >= 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_case_call_logs_case_id ON case_call_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_employee_id ON case_call_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_ptp_date ON case_call_logs(ptp_date);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_created_at ON case_call_logs(created_at);

-- ============================================================================
-- 12. TEAM TELECALLERS JUNCTION TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS team_telecallers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  telecaller_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_telecallers_team_id ON team_telecallers(team_id);
CREATE INDEX IF NOT EXISTS idx_team_telecallers_telecaller_id ON team_telecallers(telecaller_id);

-- ============================================================================
-- 13. TELECALLER TARGETS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS telecaller_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  telecaller_id uuid UNIQUE NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  daily_calls_target integer DEFAULT 0 CHECK (daily_calls_target >= 0),
  weekly_calls_target integer DEFAULT 0 CHECK (weekly_calls_target >= 0),
  monthly_calls_target integer DEFAULT 0 CHECK (monthly_calls_target >= 0),
  daily_collections_target numeric DEFAULT 0 CHECK (daily_collections_target >= 0),
  weekly_collections_target numeric DEFAULT 0 CHECK (weekly_collections_target >= 0),
  monthly_collections_target numeric DEFAULT 0 CHECK (monthly_collections_target >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_telecaller_targets_telecaller_id ON telecaller_targets(telecaller_id);

-- ============================================================================
-- 14. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  sender_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL CHECK (type IN ('info', 'warning', 'success', 'error')),
  target_type text NOT NULL CHECK (target_type IN ('all', 'team', 'user')),
  target_id uuid,
  created_at timestamptz DEFAULT now(),
  is_read boolean DEFAULT false
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_id ON notifications(target_id);

-- ============================================================================
-- 15. USER ACTIVITY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  login_time timestamptz DEFAULT now(),
  logout_time timestamptz,
  last_active_time timestamptz DEFAULT now(),
  status varchar DEFAULT 'Online' CHECK (status IN ('Online', 'Break', 'Offline', 'Idle')),
  total_break_time integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  current_break_start timestamptz,
  total_idle_time integer DEFAULT 0,
  logout_reason varchar
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_activity_employee_id ON user_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_status ON user_activity(status);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_id ON user_activity(tenant_id);

-- ============================================================================
-- 16. VIEWED CASE LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS viewed_case_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_case_id ON viewed_case_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_employee_id ON viewed_case_logs(employee_id);

-- ============================================================================
-- 17. CASE VIEWS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS case_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_case_views_case_id ON case_views(case_id);

-- ============================================================================
-- 18. OFFICE SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS office_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  office_start_time time DEFAULT '09:00:00',
  office_end_time time DEFAULT '18:00:00',
  timezone varchar DEFAULT 'Asia/Kolkata',
  working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_office_settings_tenant_id ON office_settings(tenant_id);

-- ============================================================================
-- 19. SECURITY AUDIT LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS security_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE,
  user_id uuid,
  user_role text,
  event_type text NOT NULL CHECK (event_type IN ('login', 'logout', 'failed_login', 'data_access', 'data_modification', 'data_deletion', 'cross_tenant_attempt', 'permission_denied', 'context_set', 'context_cleared')),
  table_name text,
  record_id uuid,
  action text,
  ip_address inet,
  user_agent text,
  request_path text,
  success boolean DEFAULT true,
  error_message text,
  additional_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_tenant_id ON security_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at);

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default super admin
-- Username: admin
-- Password: admin123
-- IMPORTANT: Change this password immediately after first login!
INSERT INTO super_admins (username, password_hash)
VALUES ('admin', '$2a$10$xQN5RfCqX6qQqx4xqF0W1.7HYBFqL3V3PQXGxqxfX4xvp0x6XnQgG')
ON CONFLICT (username) DO NOTHING;

-- ============================================================================
-- DISABLE RLS FOR CUSTOM AUTH (Development Only)
-- ============================================================================
-- WARNING: Only use this for development/testing
-- For production, implement proper RLS policies

ALTER TABLE employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE customer_cases DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_call_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE column_configurations DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_activity DISABLE ROW LEVEL SECURITY;
ALTER TABLE viewed_case_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE case_views DISABLE ROW LEVEL SECURITY;
ALTER TABLE office_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE team_telecallers DISABLE ROW LEVEL SECURITY;
ALTER TABLE telecaller_targets DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- List all tables
SELECT
  table_name,
  (SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;

-- Verify super admin
SELECT id, username, created_at FROM super_admins;
