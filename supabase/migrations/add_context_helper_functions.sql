-- Add helper functions to set session variables
-- These wrap PostgreSQL's set_config for use via Supabase RPC

CREATE OR REPLACE FUNCTION set_tenant_context(tenant_uuid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', tenant_uuid, false);
END;
$$;

CREATE OR REPLACE FUNCTION set_user_context(user_uuid text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_user_id', user_uuid, false);
END;
$$;

CREATE OR REPLACE FUNCTION clear_session_context()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM set_config('app.current_tenant_id', '', false);
  PERFORM set_config('app.current_user_id', '', false);
END;
$$;

COMMENT ON FUNCTION set_tenant_context(text) IS 'Sets the tenant context for RLS policies';
COMMENT ON FUNCTION set_user_context(text) IS 'Sets the user context for super admin checks';
COMMENT ON FUNCTION clear_session_context() IS 'Clears all session context variables';
