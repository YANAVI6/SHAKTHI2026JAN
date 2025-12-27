-- ============================================================================
-- PHASE 1: Tenant Context & Helper Functions
-- ============================================================================

-- Function to get current tenant ID from session context
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  -- Try to get tenant_id from session variable
  RETURN (current_setting('app.current_tenant_id', true))::uuid;
EXCEPTION
  WHEN OTHERS THEN
    -- Return NULL if not set or invalid
    RETURN NULL;
END;
$$;

-- Function to check if current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get user ID from JWT or session
  current_user_id := (current_setting('app.current_user_id', true))::uuid;
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if user exists in super_admins table
  RETURN EXISTS (
    SELECT 1 FROM super_admins
    WHERE id = current_user_id
    AND status = 'active'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Function to validate tenant access
CREATE OR REPLACE FUNCTION can_access_tenant(check_tenant_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  current_tenant uuid;
BEGIN
  -- Super admins can access all tenants
  IF is_super_admin() THEN
    RETURN true;
  END IF;
  
  -- Get current tenant from context
  current_tenant := get_current_tenant_id();
  
  -- Check if tenant matches
  RETURN current_tenant = check_tenant_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- Add comments for documentation
COMMENT ON FUNCTION get_current_tenant_id() IS 'Returns the current tenant ID from session context';
COMMENT ON FUNCTION is_super_admin() IS 'Checks if the current user is an active super admin';
COMMENT ON FUNCTION can_access_tenant(uuid) IS 'Validates if current user can access the specified tenant (super admins can access all)';
