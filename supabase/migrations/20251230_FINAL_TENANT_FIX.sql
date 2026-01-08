-- COMPLETE FIX: Tenant Creation and Slug-based routing
-- This migration fixes:
-- 1. Missing RLS policies for tenant creation
-- 2. Missing database functions for validation
-- 3. Alignment with path-based routing (slugs) instead of subdomains

-- ============================================================================
-- 1. PERMISSIONS (RLS)
-- ============================================================================
-- Allow anon to manage tenants (SuperAdmin dashboard uses anon client)
DROP POLICY IF EXISTS "Allow anon select tenants" ON tenants;
DROP POLICY IF EXISTS "Allow anon insert tenants" ON tenants;
DROP POLICY IF EXISTS "Allow anon update tenants" ON tenants;
DROP POLICY IF EXISTS "Allow anon delete tenants" ON tenants;
DROP POLICY IF EXISTS "Allow anon read access to tenants" ON "public"."tenants";
DROP POLICY IF EXISTS "Allow anon insert access to tenants" ON "public"."tenants";
DROP POLICY IF EXISTS "Allow anon update access to tenants" ON "public"."tenants";
DROP POLICY IF EXISTS "Allow anon delete access to tenants" ON "public"."tenants";

CREATE POLICY "Allow anon select tenants" ON tenants FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert tenants" ON tenants FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update tenants" ON tenants FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete tenants" ON tenants FOR DELETE TO anon USING (true);

-- ============================================================================
-- 2. UTILITY FUNCTIONS
-- ============================================================================

-- Function to validate slug format (3-63 chars, lowercase, hyphens)
CREATE OR REPLACE FUNCTION "public"."validate_slug_format"("slug_value" "text") RETURNS boolean
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $_$
BEGIN
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

-- Function for updated_at trigger
CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. TRIGGERS
-- ============================================================================

-- Cleanup old triggers if they exist
DROP TRIGGER IF EXISTS "trigger_normalize_validate_subdomain_insert" ON "public"."tenants";
DROP TRIGGER IF EXISTS "trigger_normalize_validate_subdomain_update" ON "public"."tenants";
DROP TRIGGER IF EXISTS "trigger_normalize_validate_tenant_slug" ON "public"."tenants";

-- Core trigger function for tenants
CREATE OR REPLACE FUNCTION "public"."normalize_and_validate_tenant_slug"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  -- 1. Normalize slug
  NEW.slug := LOWER(TRIM(NEW.slug));
  
  -- 2. Validation
  IF NOT public.validate_slug_format(NEW.slug) THEN
    RAISE EXCEPTION 'Invalid URL format';
  END IF;

  -- 3. Sync subdomain column for backward compatibility
  NEW.subdomain := NEW.slug;
  
  RETURN NEW;
END;
$$;

-- Apply the new trigger
CREATE TRIGGER "trigger_normalize_validate_tenant_slug"
  BEFORE INSERT OR UPDATE OF "slug" ON "public"."tenants"
  FOR EACH ROW EXECUTE FUNCTION "public"."normalize_and_validate_tenant_slug"();

-- Function for user activity
CREATE OR REPLACE FUNCTION "public"."update_user_activity_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql" SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function for security logging
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
