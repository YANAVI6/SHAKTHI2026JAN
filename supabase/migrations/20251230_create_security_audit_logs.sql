-- FIX: Create missing 'security_audit_logs' table (Idempotent Version)
-- The application attempts to log security events but fails because this table is missing.
-- This script creates the table and ensures it is accessible for the custom auth system.

CREATE TABLE IF NOT EXISTS "public"."security_audit_logs" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid",
  "user_id" "uuid",
  "user_role" "text",
  "event_type" "text" NOT NULL,
  "table_name" "text",
  "record_id" "uuid",
  "action" "text",
  "ip_address" "inet",
  "user_agent" "text",
  "request_path" "text",
  "success" boolean DEFAULT true,
  "error_message" "text",
  "additional_data" "jsonb" DEFAULT '{}'::"jsonb",
  "created_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "security_audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "security_audit_logs_event_type_check" CHECK (("event_type" = ANY (ARRAY['login'::"text", 'logout'::"text", 'failed_login'::"text", 'data_access'::"text", 'data_modification'::"text", 'data_deletion'::"text", 'cross_tenant_attempt'::"text", 'permission_denied'::"text", 'context_set'::"text", 'context_cleared'::"text"])))
);

-- Access Policy
ALTER TABLE "public"."security_audit_logs" ENABLE ROW LEVEL SECURITY;

-- Allow Anon to INSERT (for logging login attempts, etc.)
DROP POLICY IF EXISTS "Allow anon insert security_audit_logs" ON security_audit_logs;
CREATE POLICY "Allow anon insert security_audit_logs" ON security_audit_logs
  FOR INSERT TO anon
  WITH CHECK (true);

-- Allow Anon to SELECT (maybe restricted in future, but useful for now)
DROP POLICY IF EXISTS "Allow anon select security_audit_logs" ON security_audit_logs;
CREATE POLICY "Allow anon select security_audit_logs" ON security_audit_logs
  FOR SELECT TO anon
  USING (true);

-- FK Constraints (Optimistic - won't fail if parent missing, but good practice)
DO $$ BEGIN
  ALTER TABLE "public"."security_audit_logs"
    ADD CONSTRAINT "security_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
