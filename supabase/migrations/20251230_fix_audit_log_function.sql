-- FIX: log_security_event function search path issue
-- This function was broken when we set search_path = '' because it used unqualified table names.
-- We redefine it here with fully qualified names (public.security_audit_logs).

CREATE OR REPLACE FUNCTION public.log_security_event(
  p_tenant_id uuid,
  p_user_id uuid,
  p_user_role text,
  p_event_type text,
  p_table_name text DEFAULT NULL,
  p_record_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL,
  p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = '' -- Keep security fix
AS $$
DECLARE
  log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs ( -- Qualified name
    tenant_id,
    user_id,
    user_role,
    event_type,
    table_name,
    record_id,
    action,
    success,
    error_message,
    additional_data
  ) VALUES (
    p_tenant_id,
    p_user_id,
    p_user_role,
    p_event_type,
    p_table_name,
    p_record_id,
    p_action,
    p_success,
    p_error_message,
    p_additional_data
  )
  RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;
