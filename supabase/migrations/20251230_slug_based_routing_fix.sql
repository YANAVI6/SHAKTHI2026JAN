-- FIX: Simplify Tenants table for Slug-based (Path) routing
-- Since subdomains are not used, we remove the restrictive triggers and sync slug/subdomain columns

-- 1. Remove subdomain-specific triggers that depend on missing functions
DROP TRIGGER IF EXISTS "trigger_normalize_validate_subdomain_insert" ON "public"."tenants";
DROP TRIGGER IF EXISTS "trigger_normalize_validate_subdomain_update" ON "public"."tenants";

-- 2. Define a more general Slug/Identifier validation function
CREATE OR REPLACE FUNCTION "public"."validate_slug_format"("slug_value" "text") RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $_$
BEGIN
  -- Basic slug validation: 3-63 chars, lowercase alphanumeric and hyphens
  IF slug_value IS NULL OR LENGTH(TRIM(slug_value)) = 0 THEN
    RAISE EXCEPTION 'Identifier cannot be empty';
  END IF;
  IF LENGTH(slug_value) < 3 OR LENGTH(slug_value) > 63 THEN
    RAISE EXCEPTION 'Identifier must be between 3 and 63 characters';
  END IF;
  IF slug_value !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Identifier can only contain lowercase letters, numbers, and hyphens';
  END IF;
  RETURN true;
END;
$_$;

-- 3. Create a unified trigger function for slugs
CREATE OR REPLACE FUNCTION "public"."normalize_and_validate_tenant_slug"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- Normalize slug
  NEW.slug := LOWER(TRIM(NEW.slug));
  
  -- Validation
  IF NOT public.validate_slug_format(NEW.slug) THEN
    RAISE EXCEPTION 'Invalid custom URL format';
  END IF;

  -- Ensure subdomain is synced for backward compatibility if it exists
  NEW.subdomain := NEW.slug;
  
  RETURN NEW;
END;
$$;

-- 4. Apply the new trigger
CREATE TRIGGER "trigger_normalize_validate_tenant_slug"
  BEFORE INSERT OR UPDATE OF "slug" ON "public"."tenants"
  FOR EACH ROW EXECUTE FUNCTION "public"."normalize_and_validate_tenant_slug"();

-- 5. Restore other essential utility functions (needed by other tables)
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_user_activity_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

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
