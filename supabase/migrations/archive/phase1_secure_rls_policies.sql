-- ============================================================================
-- PHASE 1: Secure RLS Policies for Critical Tables
-- ============================================================================
-- This migration updates RLS policies for the most critical tables first:
-- - customer_cases (loan data)
-- - employees (user data)  
-- - case_call_logs (call records)
-- ============================================================================

-- ============================================================================
-- TABLE: customer_cases
-- ============================================================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow anon read customer cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon insert customer cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon update customer cases" ON customer_cases;
DROP POLICY IF EXISTS "Allow anon delete customer cases" ON customer_cases;

-- Create secure tenant-isolated policies
CREATE POLICY "Tenant isolation - SELECT customer_cases"
  ON customer_cases FOR SELECT
  TO anon
  USING (
    -- Super admins can see all tenants
    is_super_admin() OR
    -- Regular users can only see their tenant's data
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT customer_cases"
  ON customer_cases FOR INSERT
  TO anon
  WITH CHECK (
    -- Can only insert into own tenant
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE customer_cases"
  ON customer_cases FOR UPDATE
  TO anon
  USING (
    -- Super admins can update all tenants
    is_super_admin() OR
    -- Regular users can only update their tenant's data
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    -- Cannot change tenant_id
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE customer_cases"
  ON customer_cases FOR DELETE
  TO anon
  USING (
    -- Super admins can delete from all tenants
    is_super_admin() OR
    -- Regular users can only delete their tenant's data
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: employees
-- ============================================================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow anon to read employees" ON employees;
DROP POLICY IF EXISTS "Allow anon to insert employees" ON employees;
DROP POLICY IF EXISTS "Allow anon to update employees" ON employees;
DROP POLICY IF EXISTS "Allow anon to delete employees" ON employees;

-- Create secure tenant-isolated policies
CREATE POLICY "Tenant isolation - SELECT employees"
  ON employees FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT employees"
  ON employees FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE employees"
  ON employees FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - DELETE employees"
  ON employees FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- TABLE: case_call_logs
-- ============================================================================

-- Drop existing insecure policies
DROP POLICY IF EXISTS "Allow anon read call logs" ON case_call_logs;
DROP POLICY IF EXISTS "Allow anon insert call logs" ON case_call_logs;
DROP POLICY IF EXISTS "Allow anon update call logs" ON case_call_logs;

-- Create secure tenant-isolated policies
CREATE POLICY "Tenant isolation - SELECT case_call_logs"
  ON case_call_logs FOR SELECT
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - INSERT case_call_logs"
  ON case_call_logs FOR INSERT
  TO anon
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

CREATE POLICY "Tenant isolation - UPDATE case_call_logs"
  ON case_call_logs FOR UPDATE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  )
  WITH CHECK (
    tenant_id = get_current_tenant_id()
  );

-- Add DELETE policy for completeness
CREATE POLICY "Tenant isolation - DELETE case_call_logs"
  ON case_call_logs FOR DELETE
  TO anon
  USING (
    is_super_admin() OR
    tenant_id = get_current_tenant_id()
  );

-- ============================================================================
-- Verification Queries (for testing)
-- ============================================================================

-- These queries can be used to verify the policies are working:
-- 
-- 1. Set tenant context:
--    SELECT set_config('app.current_tenant_id', 'your-tenant-uuid', false);
--
-- 2. Query should only return data for that tenant:
--    SELECT COUNT(*) FROM customer_cases;
--
-- 3. Try to access another tenant's data (should return 0):
--    SELECT COUNT(*) FROM customer_cases WHERE tenant_id != get_current_tenant_id();
--
-- 4. Super admin test:
--    SELECT set_config('app.current_user_id', 'super-admin-uuid', false);
--    SELECT COUNT(*) FROM customer_cases; -- Should return all records

COMMENT ON POLICY "Tenant isolation - SELECT customer_cases" ON customer_cases IS 'Phase 1: Enforces tenant isolation for SELECT operations. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT employees" ON employees IS 'Phase 1: Enforces tenant isolation for SELECT operations. Super admins can access all tenants.';
COMMENT ON POLICY "Tenant isolation - SELECT case_call_logs" ON case_call_logs IS 'Phase 1: Enforces tenant isolation for SELECT operations. Super admins can access all tenants.';
