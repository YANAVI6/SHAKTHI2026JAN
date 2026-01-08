-- RESTORE: Missing Database Functions 
-- These functions are required by triggers on core tables (especially 'tenants')

-- 1. validate_subdomain_format
CREATE OR REPLACE FUNCTION "public"."validate_subdomain_format"("subdomain_value" "text") RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $_$
DECLARE
  reserved_subdomains text[] := ARRAY[
    'www', 'admin', 'superadmin', 'api', 'app', 'mail', 'smtp', 'ftp',
    'webmail', 'cpanel', 'whm', 'blog', 'forum', 'shop', 'store',
    'dashboard', 'portal', 'support', 'help', 'docs', 'status',
    'dev', 'staging', 'test', 'demo', 'sandbox', 'localhost',
    'ns1', 'ns2', 'dns', 'cdn', 'assets', 'static', 'media',
    'files', 'images'
  ];
BEGIN
  IF subdomain_value IS NULL OR LENGTH(TRIM(subdomain_value)) = 0 THEN
    RAISE EXCEPTION 'Subdomain cannot be empty';
  END IF;
  IF LENGTH(subdomain_value) < 3 THEN
    RAISE EXCEPTION 'Subdomain must be at least 3 characters long';
  END IF;
  IF LENGTH(subdomain_value) > 63 THEN
    RAISE EXCEPTION 'Subdomain must not exceed 63 characters';
  END IF;
  IF LOWER(subdomain_value) = ANY(reserved_subdomains) THEN
    RAISE EXCEPTION 'This subdomain is reserved and cannot be used';
  END IF;
  IF subdomain_value !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Subdomain can only contain lowercase letters, numbers, and hyphens (not at start/end)';
  END IF;
  RETURN true;
END;
$_$;

-- 2. normalize_and_validate_subdomain (Trigger function)
CREATE OR REPLACE FUNCTION "public"."normalize_and_validate_subdomain"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.subdomain := LOWER(TRIM(NEW.subdomain));
  -- Call the external validation function
  -- We use public. because search_path is empty for security
  IF NOT public.validate_subdomain_format(NEW.subdomain) THEN
    RAISE EXCEPTION 'Invalid subdomain format';
  END IF;
  RETURN NEW;
END;
$$;

-- 3. update_updated_at_column (Common trigger function)
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 4. update_user_activity_updated_at
CREATE OR REPLACE FUNCTION "public"."update_user_activity_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- 5. log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_tenant_id uuid, p_user_id uuid, p_user_role text, p_event_type text,
  p_table_name text DEFAULT NULL, p_record_id uuid DEFAULT NULL,
  p_action text DEFAULT NULL, p_success boolean DEFAULT true,
  p_error_message text DEFAULT NULL, p_additional_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE log_id uuid;
BEGIN
  INSERT INTO public.security_audit_logs (
    tenant_id, user_id, user_role, event_type, table_name,
    record_id, action, success, error_message, additional_data
  ) VALUES (
    p_tenant_id, p_user_id, p_user_role, p_event_type, p_table_name,
    p_record_id, p_action, p_success, p_error_message, p_additional_data
  ) RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;
