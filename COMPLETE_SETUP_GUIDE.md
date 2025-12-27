# Complete Setup Guide - Shakti CRM

This guide will walk you through setting up the Shakti CRM system from scratch, including Supabase database setup and GitHub deployment.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Supabase Setup](#supabase-setup)
3. [Database Migration](#database-migration)
4. [GitHub Setup](#github-setup)
5. [Environment Configuration](#environment-configuration)
6. [Deployment](#deployment)

---

## Prerequisites

Before you begin, ensure you have:
- A Supabase account (sign up at https://supabase.com)
- A GitHub account
- Node.js 18+ installed
- Git installed

---

## Supabase Setup

### Step 1: Create a New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in the details:
   - **Project Name**: shakti-crm (or your preferred name)
   - **Database Password**: Create a strong password (SAVE THIS!)
   - **Region**: Choose the closest region to your users
   - **Plan**: Choose your plan (Free tier works for testing)
4. Click "Create new project"
5. Wait 2-3 minutes for the project to be provisioned

### Step 2: Get Your Supabase Credentials

Once your project is ready:

1. Go to **Project Settings** (gear icon in the sidebar)
2. Click on **API** section
3. Copy the following values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)
   - **service_role key**: `eyJhbGc...` (different long string)

4. Go to **Database** section under Settings
5. Under "Connection string", select **URI** tab
6. Copy the connection string (looks like: `postgresql://postgres:[YOUR-PASSWORD]@...`)

### Step 3: Configure Database Access

1. In Supabase Dashboard, go to **SQL Editor**
2. We'll use this to run migrations

---

## Database Migration

### Step 1: Run Initial Table Creation

Copy and paste the following SQL in the **SQL Editor** and click **RUN**:

```sql
-- Migration 1: Create all base tables
-- This creates the entire database schema

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Super Admins Table
CREATE TABLE IF NOT EXISTS super_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- 2. Tenants Table
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

-- 3. Tenant Databases Table
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

-- 4. Company Admins Table
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

-- 5. Tenant Migrations Table
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

-- 6. Audit Logs Table
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

-- 7. Employees Table
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

-- 8. Teams Table
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

-- Add team_id foreign key to employees
ALTER TABLE employees
ADD CONSTRAINT employees_team_id_fkey
FOREIGN KEY (team_id) REFERENCES teams(id);

-- 9. Column Configurations Table
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

-- 10. Customer Cases Table
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

-- 11. Case Call Logs Table
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

-- 12. Team Telecallers Junction Table
CREATE TABLE IF NOT EXISTS team_telecallers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  telecaller_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by uuid REFERENCES employees(id),
  created_at timestamptz DEFAULT now()
);

-- 13. Telecaller Targets Table
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

-- 14. Notifications Table
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

-- 15. User Activity Table
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

-- 16. Viewed Case Logs Table
CREATE TABLE IF NOT EXISTS viewed_case_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

-- 17. Case Views Table
CREATE TABLE IF NOT EXISTS case_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES customer_cases(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  viewed_at timestamptz DEFAULT now()
);

-- 18. Office Settings Table
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

-- 19. Security Audit Logs Table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_customer_cases_tenant_id ON customer_cases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_telecaller_id ON customer_cases(telecaller_id);
CREATE INDEX IF NOT EXISTS idx_customer_cases_team_id ON customer_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_case_id ON case_call_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_case_call_logs_ptp_date ON case_call_logs(ptp_date);
CREATE INDEX IF NOT EXISTS idx_employees_tenant_id ON employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_role ON employees(role);
CREATE INDEX IF NOT EXISTS idx_teams_tenant_id ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_employee_id ON user_activity(employee_id);
CREATE INDEX IF NOT EXISTS idx_user_activity_status ON user_activity(status);
```

### Step 2: Insert Initial Super Admin

```sql
-- Create a super admin account
-- Default credentials: username: admin, password: admin123
-- CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!

INSERT INTO super_admins (username, password_hash)
VALUES ('admin', '$2a$10$xQN5RfCqX6qQqx4xqF0W1.7HYBFqL3V3PQXGxqxfX4xvp0x6XnQgG')
ON CONFLICT (username) DO NOTHING;
```

**IMPORTANT**: The default password is `admin123`. Change it immediately after logging in!

### Step 3: Disable RLS for Development (Optional - Not Recommended for Production)

Since the application uses custom authentication (not Supabase Auth), you may need to disable RLS temporarily:

```sql
-- WARNING: Only do this for development/testing
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
```

---

## GitHub Setup

### Step 1: Initialize Git Repository (if not already done)

```bash
# In your project root directory
git init
git add .
git commit -m "Initial commit - Shakti CRM"
```

### Step 2: Create GitHub Repository

1. Go to https://github.com/new
2. Create a new repository:
   - **Repository name**: shakti-crm (or your preferred name)
   - **Description**: Shakti CRM - Customer Relationship Management System
   - **Visibility**: Private (recommended) or Public
   - DO NOT initialize with README, .gitignore, or license (we already have these)
3. Click "Create repository"

### Step 3: Push to GitHub

```bash
# Replace YOUR_USERNAME and YOUR_REPO with your actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Environment Configuration

### Step 1: Create .env File

In your project root, create a `.env` file with your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

**IMPORTANT**: Never commit the `.env` file to GitHub! It's already in `.gitignore`.

### Step 2: Update Domain Configuration (Optional)

If you're using custom domains, update `src/config/domain.ts`:

```typescript
export const DOMAIN_CONFIG = {
  mainDomain: 'yourcompany.com',
  subdomainPattern: '.yourcompany.com'
};
```

---

## Deployment

### Option 1: Deploy to Vercel (Recommended)

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
6. Click "Deploy"

### Option 2: Deploy to Netlify

1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repository
4. Configure:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
5. Add Environment Variables in Site Settings
6. Click "Deploy"

### Option 3: Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Post-Deployment Steps

### 1. First Login

1. Navigate to your deployed URL or `http://localhost:5173`
2. Click "Super Admin Login" (if available) or go to `/super-admin`
3. Login with:
   - Username: `admin`
   - Password: `admin123`
4. **IMMEDIATELY CHANGE THE PASSWORD**

### 2. Create Your First Tenant

1. In Super Admin Dashboard, click "Create Tenant"
2. Fill in company details:
   - Company Name
   - Slug (URL-friendly identifier, e.g., "acme-corp")
   - Contact details
3. Click "Create"

### 3. Create Company Admin

1. Still in Super Admin Dashboard, go to "Manage Admins"
2. Create a Company Admin for the tenant
3. Provide credentials to the company admin

### 4. Login as Company Admin

1. Go to main login page
2. Use the tenant slug in the URL or subdomain
3. Login with Company Admin credentials
4. Start creating teams and employees

---

## Verification Steps

### Check Database Tables

Run this query in Supabase SQL Editor to verify all tables exist:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see all 19 tables listed.

### Check Super Admin

```sql
SELECT id, username, created_at
FROM super_admins;
```

You should see the admin account.

---

## Common Issues and Solutions

### Issue 1: Database Connection Errors

**Solution**: Verify your Supabase credentials in `.env` file are correct.

### Issue 2: RLS Policies Blocking Access

**Solution**: Either disable RLS for development (not recommended for production) or implement proper RLS policies.

### Issue 3: Login Not Working

**Solution**:
1. Check browser console for errors
2. Verify Supabase is reachable
3. Check if super_admins table has data
4. Verify password hash in database

### Issue 4: Build Errors

**Solution**:
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
npm run build
```

---

## Security Recommendations

1. **Change Default Passwords**: Immediately change all default passwords
2. **Enable RLS**: Implement proper Row Level Security policies for production
3. **Environment Variables**: Never expose API keys or secrets in code
4. **HTTPS**: Always use HTTPS in production
5. **Regular Backups**: Set up automated database backups in Supabase
6. **Audit Logs**: Monitor security_audit_logs regularly
7. **Update Dependencies**: Keep all npm packages up to date

---

## Support and Documentation

- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev

---

## Next Steps

1. Configure column settings for your organization
2. Set up teams and assign team leaders
3. Add telecaller employees
4. Upload customer cases
5. Set performance targets
6. Start managing cases!

---

**Congratulations!** Your Shakti CRM system is now fully set up and ready to use.
