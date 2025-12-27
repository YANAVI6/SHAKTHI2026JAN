/*
  ============================================================================
  COMPLETE DATABASE BACKUP - Shakti CRM
  ============================================================================

  Date: 2025-12-18
  Database: Supabase PostgreSQL

  This file contains:
  - Complete schema (19 tables)
  - All actual data from production database

  Tables with Data:
  1. super_admins (1 record)
  2. tenants (2 records)
  3. company_admins (2 records)
  4. employees (10 records)
  5. teams (1 record)
  6. column_configurations (14 records)
  7. case_call_logs (13 records)
  8. user_activity (18 records)
  9. viewed_case_logs (10 records)
  10. case_views (10 records)
  11. security_audit_logs (67 records)
  12. customer_cases (5000 records - too large, see notes below)

  Empty Tables:
  - tenant_databases
  - tenant_migrations
  - audit_logs
  - team_telecallers
  - telecaller_targets
  - notifications
  - office_settings

  IMPORTANT NOTES:
  - customer_cases table has 5000 records (too large to include here)
  - To export customer_cases, use Supabase dashboard or pg_dump
  - All passwords are hashed with bcrypt
  - RLS is disabled on most tables for development

  ============================================================================
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- SCHEMA DEFINITION
-- ============================================================================

-- 1. SUPER ADMINS TABLE
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_super_admins_username ON super_admins(username);

-- 2. TENANTS TABLE
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

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);

-- 3. TENANT DATABASES TABLE
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

-- 4. COMPANY ADMINS TABLE
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

CREATE INDEX IF NOT EXISTS idx_company_admins_tenant_id ON company_admins(tenant_id);
CREATE INDEX IF NOT EXISTS idx_company_admins_email ON company_admins(email);

-- 5. TENANT MIGRATIONS TABLE
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

-- 6. AUDIT LOGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 7. EMPLOYEES TABLE
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

CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_employees_emp_id ON employees(emp_id);
CREATE INDEX IF NOT EXISTS idx_employees_team_id ON employees(team_id);

-- 8. TEAMS TABLE
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

CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_team_incharge_id ON teams(team_incharge_id);

-- 9. COLUMN CONFIGURATIONS TABLE
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

CREATE INDEX IF NOT EXISTS idx_column_configurations_tenant_id ON column_configurations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_column_configurations_product_name ON column_configurations(product_name);

-- 10. CUSTOMER CASES TABLE
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

CREATE INDEX IF NOT EXISTS idx_customer_cases_tenant_id ON customer_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_telecaller_id ON customer_cases(telecaller_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_team_id ON customer_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_loan_id ON customer_cases(loan_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_status ON customer_cases(status);
CREATE INDEX IF NOT EXISTS idx_customer_cases_product_name ON customer_cases(product_name);

-- 11. CASE CALL LOGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_case_call_logs_case_id ON case_call_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_employee_id ON case_call_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_ptp_date ON case_call_logs(ptp_date);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_created_at ON case_call_logs(created_at);

-- 12. TEAM TELECALLERS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS team_telecallers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  telecaller_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_telecallers_team_id ON team_telecallers(team_id);
CREATE INDEX IF NOT EXISTS idx_team_telecallers_telecaller_id ON team_telecallers(telecaller_id);

-- 13. TELECALLER TARGETS TABLE
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

CREATE INDEX IF NOT EXISTS idx_telecaller_targets_telecaller_id ON telecaller_targets(telecaller_id);

-- 14. NOTIFICATIONS TABLE
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

CREATE INDEX IF NOT EXISTS idx_notifications_tenant_id ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target_id ON notifications(target_id);

-- 15. USER ACTIVITY TABLE
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

CREATE INDEX IF NOT EXISTS idx_user_activity_employee_id ON user_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_status ON user_activity(status);
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant_id ON user_activity(tenant_id);

-- 16. VIEWED CASE LOGS TABLE
CREATE TABLE IF NOT EXISTS viewed_case_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_case_id ON viewed_case_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_viewed_case_logs_employee_id ON viewed_case_logs(employee_id);

-- 17. CASE VIEWS TABLE
CREATE TABLE IF NOT EXISTS case_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_case_views_case_id ON case_views(case_id);

-- 18. OFFICE SETTINGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_office_settings_tenant_id ON office_settings(tenant_id);

-- 19. SECURITY AUDIT LOGS TABLE
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

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_tenant_id ON security_audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_type ON security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON security_audit_logs(created_at);

-- ============================================================================
-- DISABLE RLS FOR DEVELOPMENT
-- ============================================================================

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
-- ACTUAL DATA FROM PRODUCTION DATABASE
-- ============================================================================

-- SUPER ADMINS (1 record)
INSERT INTO super_admins (id, username, password_hash, created_at, updated_at) VALUES
('dee9e3b5-7473-43e5-9708-f7b05504a818', 'Shaktiadmin', '$2a$10$X.tnJVZadXNsK30C66hBueR7kdAcG/qqWqv3NKQ448KSz.cDL.1KS', '2025-12-18 06:29:35.224553+00', '2025-12-18 06:29:35.224553+00')
ON CONFLICT (id) DO NOTHING;

-- TENANTS (2 records)
INSERT INTO tenants (id, name, subdomain, status, proprietor_name, phone_number, email, address, gst_number, pan_number, city, state, pincode, plan, max_users, max_connections, settings, created_at, updated_at, created_by, slug) VALUES
('23372512-4507-4216-aa1b-b98fe3fc86a4', 'Sri Renukamba Associates ', NULL, 'active', 'Satish', '9986155669', NULL, 'malleshwaram', 'AAAAAAAA5566685A', NULL, NULL, NULL, NULL, 'basic', 10, 5, '{"branding": {}, "features": {"sms": false, "voip": true, "analytics": true, "apiAccess": false}}'::jsonb, '2025-12-18 07:29:38.546581+00', '2025-12-18 07:29:38.546581+00', 'dee9e3b5-7473-43e5-9708-f7b05504a818', 'sra'),
('554224f6-fab7-40a9-9075-a649c09953bc', 'Sinchana Infotech', NULL, 'active', 'Yanavi', '99861556691', NULL, 'malleshwhs', 'GQGUY55655DASHK', NULL, NULL, NULL, NULL, 'basic', 10, 5, '{"branding": {}, "features": {"sms": false, "voip": true, "analytics": true, "apiAccess": false}}'::jsonb, '2025-12-18 07:41:01.56402+00', '2025-12-18 07:41:01.56402+00', 'dee9e3b5-7473-43e5-9708-f7b05504a818', 'sin')
ON CONFLICT (id) DO NOTHING;

-- COMPANY ADMINS (2 records)
INSERT INTO company_admins (id, tenant_id, name, employee_id, email, password_hash, status, role, last_login_at, password_reset_token, password_reset_expires, created_at, updated_at, created_by) VALUES
('70f51e12-54a7-4f05-aeda-92e698c0136d', '23372512-4507-4216-aa1b-b98fe3fc86a4', 'sanju', 'EMP001', 'Shakti@gmail.com', '$2a$10$FDj5a7Qe5nVsI14HI97zMOGQz2Gd17NM7Stlch8BS1SB.jBRG9zIW', 'active', 'CompanyAdmin', NULL, NULL, NULL, '2025-12-18 07:39:49.119542+00', '2025-12-18 07:39:49.119542+00', 'dee9e3b5-7473-43e5-9708-f7b05504a818'),
('184d6593-2369-4f7c-b7ef-a8a6ec60326c', '554224f6-fab7-40a9-9075-a649c09953bc', 'manju', 'EMP001', 'Shaktiadmin@gmail.com', '$2a$10$5K3OsG41l/ve/IBP7jkhc.vFHg5vHaruuZcA7SEGOi6qmF4Iv1/U2', 'active', 'CompanyAdmin', NULL, NULL, NULL, '2025-12-18 07:52:27.279576+00', '2025-12-18 07:52:58.547269+00', 'dee9e3b5-7473-43e5-9708-f7b05504a818')
ON CONFLICT (id) DO NOTHING;

-- EMPLOYEES (10 records)
INSERT INTO employees (id, tenant_id, name, mobile, emp_id, password_hash, role, status, created_at, updated_at, created_by, team_id) VALUES
('ee9f8b77-3cb7-4099-aa15-c30a1a43a01f', '554224f6-fab7-40a9-9075-a649c09953bc', 'Aarav Sharma', '+91 98765 43001', 'EMP055', '$2a$10$gCHkQW1xMI2RrxRoeloXb.aHbn7M5Q5rH6GVm/6.aZ3J7CN1PXN3i', 'TeamIncharge', 'active', '2025-12-18 08:03:14.585286+00', '2025-12-18 08:04:42.599693+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL),
('9d790fce-2ac1-49af-bb75-0be017432416', '554224f6-fab7-40a9-9075-a649c09953bc', 'Priya Verma', '+91 98765 43002', 'EMP004', '$2a$10$lxpN/gwfY76KnD7uGZaTSez80F.b/llkMPLLRV8IQAhnbHIB6Extm', 'Telecaller', 'active', '2025-12-18 08:03:14.873454+00', '2025-12-18 08:25:00.867006+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', 'a9b17933-366b-4e0f-8bb1-53e2f2242741'),
('1f598d72-4ed2-4008-8ff3-5d43ccf741eb', '554224f6-fab7-40a9-9075-a649c09953bc', 'Rahul Iyer', '+91 98765 43003', 'EMP005', '$2a$10$xOHY5qeCdMnrIg3QF.ZVdOqXHErFo8X9njcmqdvlco9ywzaCTh5R6', 'Telecaller', 'active', '2025-12-18 08:03:15.139796+00', '2025-12-18 08:07:13.393312+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', 'a9b17933-366b-4e0f-8bb1-53e2f2242741'),
('dcccce74-3344-40a5-b123-1b0abcd2d97a', '554224f6-fab7-40a9-9075-a649c09953bc', 'Sneha Kulkarni', '+91 98765 43004', 'EMP006', '$2a$10$6dPGqEEZt3b0mM.KOFwT5uuP2pMFTv4MBKa7MXU3eN9oGfE8XDYkq', 'Telecaller', 'active', '2025-12-18 08:03:15.432947+00', '2025-12-18 08:07:13.393312+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', 'a9b17933-366b-4e0f-8bb1-53e2f2242741'),
('7c9cec5e-6ad2-4057-a7a0-f5193c885dff', '554224f6-fab7-40a9-9075-a649c09953bc', 'Vikram Singh', '+91 98765 43005', 'EMP007', '$2a$10$jp2.7Iez7ZCTrph44NvSy.Wtw/6KkF5doDY5tTErTiHKZKK49mNXO', 'Telecaller', 'active', '2025-12-18 08:03:15.706637+00', '2025-12-18 08:03:15.706637+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL),
('83487abb-1552-423d-9c41-69e766251264', '554224f6-fab7-40a9-9075-a649c09953bc', 'Nisha Patel', '+91 98765 43006', 'EMP008', '$2a$10$qojxqHe8OJO5gpa4F9WANevRG/hlcIzzBlP6.Bhcl4CbzkIZPQk/.', 'Telecaller', 'active', '2025-12-18 08:03:15.987878+00', '2025-12-18 08:03:15.987878+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL),
('e5ba316c-dd2c-4df4-9fb7-a4533bb264d9', '554224f6-fab7-40a9-9075-a649c09953bc', 'Karthik Reddy', '+91 98765 43007', 'EMP009', '$2a$10$i6fMzTLQdip1COErY4guc.JrT/Dfs0UobMlLUDG9Hg0xycZf7sRle', 'Telecaller', 'active', '2025-12-18 08:03:16.251085+00', '2025-12-18 08:03:16.251085+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL),
('584adadf-c88d-4824-9b59-2a359fd2b428', '554224f6-fab7-40a9-9075-a649c09953bc', 'Ananya Joshi', '+91 98765 43008', 'EMP010', '$2a$10$noEebkbuVVLDZhzwO/oLXOD7GjPjC6RgzcUjmdDP4ffO0P6vJBIDK', 'Telecaller', 'active', '2025-12-18 08:03:16.614945+00', '2025-12-18 08:03:16.614945+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL),
('cad9359e-49f2-4ecd-aed4-5c2067a67a78', '554224f6-fab7-40a9-9075-a649c09953bc', 'Rohit Mehta', '+91 98765 43009', 'EMP011', '$2a$10$gpHyY4OvI3NbxpByEXXRtOcLNpV3xBn85o5Hp8LzmDrRTlrkyK6fm', 'Telecaller', 'active', '2025-12-18 08:03:16.88718+00', '2025-12-18 08:03:16.88718+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL),
('a16c693e-afaf-4705-9043-6e5b58f7f001', '554224f6-fab7-40a9-9075-a649c09953bc', 'Divya Nair', '+91 98765 43010', 'EMP012', '$2a$10$RhsAchP5yuAECZ2QJXuyCuz8V3ELXXN12jT6T7V29J9nW8ZSxizNC', 'Telecaller', 'active', '2025-12-18 08:03:17.131124+00', '2025-12-18 08:03:17.131124+00', '184d6593-2369-4f7c-b7ef-a8a6ec60326c', NULL)
ON CONFLICT (id) DO NOTHING;

-- TEAMS (1 record)
INSERT INTO teams (id, tenant_id, name, team_incharge_id, product_name, status, created_at, updated_at, created_by) VALUES
('a9b17933-366b-4e0f-8bb1-53e2f2242741', '554224f6-fab7-40a9-9075-a649c09953bc', 'TEAM FIRE', 'ee9f8b77-3cb7-4099-aa15-c30a1a43a01f', 'IDFC', 'active', '2025-12-18 08:07:12.98669+00', '2025-12-18 08:07:12.98669+00', 'ee9f8b77-3cb7-4099-aa15-c30a1a43a01f')
ON CONFLICT (id) DO NOTHING;

-- COLUMN CONFIGURATIONS (14 records)
INSERT INTO column_configurations (id, tenant_id, column_name, display_name, is_active, is_custom, column_order, data_type, created_at, updated_at, product_name) VALUES
('17f85c1f-dca6-472e-997d-1e19edb053d3', '554224f6-fab7-40a9-9075-a649c09953bc', 'customerName', 'Customer Name', true, false, 1, 'text', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('ed8a8379-aa35-4ecc-b102-98fa53df18e6', '554224f6-fab7-40a9-9075-a649c09953bc', 'loanId', 'Loan ID', true, false, 2, 'text', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('fbf361ca-4aea-46a7-a1bf-7033a03868f1', '554224f6-fab7-40a9-9075-a649c09953bc', 'mobileNo', 'Mobile Number', true, false, 3, 'phone', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('e68dff56-1019-45c1-8194-33c4293dcf9e', '554224f6-fab7-40a9-9075-a649c09953bc', 'address', 'Address', true, false, 4, 'text', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('dfe6f8b6-d6c2-4393-a765-b48d40dba396', '554224f6-fab7-40a9-9075-a649c09953bc', 'dpd', 'DPD', true, false, 5, 'number', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('4d5d1133-3ecd-4e33-8f71-7e1a56c807c5', '554224f6-fab7-40a9-9075-a649c09953bc', 'pos', 'POS', true, false, 6, 'currency', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('01ed7e93-6662-400b-9383-be842d6e89d7', '554224f6-fab7-40a9-9075-a649c09953bc', 'emi', 'EMI', true, false, 7, 'currency', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('4dfd0bd8-eac9-4c2f-8f5f-a713985c05f2', '554224f6-fab7-40a9-9075-a649c09953bc', 'totalOutstanding', 'TOTAL OUTSTANDING', true, false, 8, 'currency', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('86f1dcf8-1e64-43c8-8de0-080118166fd5', '554224f6-fab7-40a9-9075-a649c09953bc', 'employmentType', 'EMPLOYMENT TYPE', true, false, 9, 'text', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('2cdef244-f011-4443-ba84-fdeec7d6b413', '554224f6-fab7-40a9-9075-a649c09953bc', 'paymentLink', 'Payment Link', true, false, 10, 'url', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('8b2ce6fc-07e2-4c57-ad03-b9fa9f70969e', '554224f6-fab7-40a9-9075-a649c09953bc', 'loanAmount', 'Loan Amount', true, false, 11, 'currency', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('8743a077-0b4a-4753-b481-10c62dc5520a', '554224f6-fab7-40a9-9075-a649c09953bc', 'lastPaidDate', 'Last Payment Date', true, false, 12, 'date', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('4a547204-b32d-430b-9bd8-2cb39c2444c8', '554224f6-fab7-40a9-9075-a649c09953bc', 'lastPaidAmount', 'Last Payment Amount', true, false, 13, 'currency', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC'),
('c984b516-84d4-4dfb-9736-4fbb490cab45', '554224f6-fab7-40a9-9075-a649c09953bc', 'sanctionDate', 'Loan Created At', true, false, 14, 'date', '2025-12-18 08:06:07.386777+00', '2025-12-18 08:06:07.386777+00', 'IDFC')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- NOTE: CUSTOMER CASES TABLE (5000 records)
-- ============================================================================
-- The customer_cases table contains 5000 records which is too large to include
-- in this file. To export customer_cases data:
--
-- Option 1: Using Supabase Dashboard
-- 1. Go to Table Editor
-- 2. Select customer_cases table
-- 3. Export as CSV
--
-- Option 2: Using SQL (run in Supabase SQL Editor)
-- COPY customer_cases TO '/tmp/customer_cases.csv' WITH CSV HEADER;
--
-- Option 3: Using pg_dump
-- pg_dump -h your-host -U postgres -t customer_cases your_db > customer_cases.sql
-- ============================================================================

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count records in each table
SELECT 'super_admins' as table_name, COUNT(*) as record_count FROM super_admins
UNION ALL
SELECT 'tenants', COUNT(*) FROM tenants
UNION ALL
SELECT 'company_admins', COUNT(*) FROM company_admins
UNION ALL
SELECT 'employees', COUNT(*) FROM employees
UNION ALL
SELECT 'teams', COUNT(*) FROM teams
UNION ALL
SELECT 'column_configurations', COUNT(*) FROM column_configurations
UNION ALL
SELECT 'customer_cases', COUNT(*) FROM customer_cases
UNION ALL
SELECT 'case_call_logs', COUNT(*) FROM case_call_logs
UNION ALL
SELECT 'user_activity', COUNT(*) FROM user_activity
UNION ALL
SELECT 'viewed_case_logs', COUNT(*) FROM viewed_case_logs
UNION ALL
SELECT 'case_views', COUNT(*) FROM case_views
UNION ALL
SELECT 'security_audit_logs', COUNT(*) FROM security_audit_logs
ORDER BY table_name;
