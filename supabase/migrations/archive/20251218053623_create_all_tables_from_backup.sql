/*
  # Create Complete Database Schema from Backup

  This migration creates the complete database schema including:

  ## 1. Extensions
    - pg_net: Network extensions
    - pg_graphql: GraphQL support
    - pg_stat_statements: Query statistics
    - pgcrypto: Cryptographic functions
    - pgjwt: JWT token generation
    - supabase_vault: Secure storage
    - uuid-ossp: UUID generation

  ## 2. Functions
    - log_security_event: Security audit logging
    - normalize_and_validate_subdomain: Subdomain validation
    - update_updated_at_column: Auto-update timestamps
    - update_user_activity_updated_at: Activity timestamp updates
    - validate_subdomain_format: Subdomain format validation

  ## 3. Tables
    - super_admins: Platform super administrators
    - tenants: Multi-tenant organizations
    - tenant_databases: Tenant database configurations
    - tenant_migrations: Migration tracking per tenant
    - company_admins: Tenant administrators
    - employees: Tenant employees (TeamIncharge, Telecaller)
    - teams: Team organization structure
    - team_telecallers: Team-telecaller associations
    - telecaller_targets: Performance targets
    - customer_cases: Customer loan cases
    - case_call_logs: Call activity logs
    - case_views: Case view tracking
    - viewed_case_logs: Historical case views
    - column_configurations: Dynamic column definitions
    - notifications: User notifications
    - office_settings: Office hours configuration
    - user_activity: User session tracking
    - audit_logs: General audit trail
    - security_audit_logs: Security event logs

  ## 4. Security
    - Row Level Security enabled on key tables
    - Policies for anon access (custom auth system)
    - Foreign key constraints for data integrity
    - Indexes for query performance

  ## 5. Important Notes
    - Uses custom authentication (not Supabase Auth)
    - RLS policies allow anon access for custom auth
    - Comprehensive audit logging system
    - Multi-tenant architecture with tenant isolation
*/

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";

-- Functions
CREATE OR REPLACE FUNCTION "public"."log_security_event"(
  "p_tenant_id" "uuid",
  "p_user_id" "uuid",
  "p_user_role" "text",
  "p_event_type" "text",
  "p_table_name" "text" DEFAULT NULL::"text",
  "p_record_id" "uuid" DEFAULT NULL::"uuid",
  "p_action" "text" DEFAULT NULL::"text",
  "p_success" boolean DEFAULT true,
  "p_error_message" "text" DEFAULT NULL::"text",
  "p_additional_data" "jsonb" DEFAULT '{}'::"jsonb"
) RETURNS "uuid"
LANGUAGE "plpgsql" SECURITY DEFINER
AS $$
DECLARE log_id uuid;
BEGIN
  INSERT INTO security_audit_logs (
    tenant_id, user_id, user_role, event_type, table_name,
    record_id, action, success, error_message, additional_data
  ) VALUES (
    p_tenant_id, p_user_id, p_user_role, p_event_type, p_table_name,
    p_record_id, p_action, p_success, p_error_message, p_additional_data
  ) RETURNING id INTO log_id;
  RETURN log_id;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."normalize_and_validate_subdomain"() RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.subdomain := LOWER(TRIM(NEW.subdomain));
  IF NOT validate_subdomain_format(NEW.subdomain) THEN
    RAISE EXCEPTION 'Invalid subdomain format';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."update_user_activity_updated_at"() RETURNS "trigger"
LANGUAGE "plpgsql"
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION "public"."validate_subdomain_format"("subdomain_value" "text") RETURNS boolean
LANGUAGE "plpgsql"
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

-- Tables
CREATE TABLE IF NOT EXISTS "public"."super_admins" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "username" "text" NOT NULL,
  "password_hash" "text" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "super_admins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "super_admins_username_key" UNIQUE ("username")
);

CREATE TABLE IF NOT EXISTS "public"."tenants" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "name" "text" NOT NULL,
  "subdomain" "text" NOT NULL,
  "status" "text" DEFAULT 'active'::"text" NOT NULL,
  "proprietor_name" "text",
  "phone_number" "text",
  "email" "text",
  "address" "text",
  "gst_number" "text",
  "pan_number" "text",
  "city" "text",
  "state" "text",
  "pincode" "text",
  "plan" "text" DEFAULT 'basic'::"text",
  "max_users" integer DEFAULT 10,
  "max_connections" integer DEFAULT 5,
  "settings" "jsonb" DEFAULT '{"branding": {}, "features": {"sms": false, "voip": false, "analytics": true, "apiAccess": false}}'::"jsonb",
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "created_by" "uuid",
  "slug" "text",
  CONSTRAINT "tenants_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenants_subdomain_key" UNIQUE ("subdomain"),
  CONSTRAINT "tenants_slug_key" UNIQUE ("slug"),
  CONSTRAINT "check_subdomain_format" CHECK (("subdomain" ~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$'::"text")),
  CONSTRAINT "check_subdomain_length" CHECK ((("length"("subdomain") >= 3) AND ("length"("subdomain") <= 63))),
  CONSTRAINT "check_subdomain_not_empty" CHECK (("length"(TRIM(BOTH FROM "subdomain")) > 0)),
  CONSTRAINT "tenants_plan_check" CHECK (("plan" = ANY (ARRAY['basic'::"text", 'standard'::"text", 'premium'::"text", 'enterprise'::"text"]))),
  CONSTRAINT "tenants_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text", 'suspended'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."tenant_databases" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "database_url" "text" NOT NULL,
  "database_name" "text" NOT NULL,
  "host" "text" NOT NULL,
  "port" integer DEFAULT 5432,
  "status" "text" DEFAULT 'healthy'::"text",
  "last_health_check" timestamp with time zone,
  "schema_version" "text" DEFAULT '1.0.0'::"text",
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "tenant_databases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_databases_tenant_id_key" UNIQUE ("tenant_id"),
  CONSTRAINT "tenant_databases_status_check" CHECK (("status" = ANY (ARRAY['healthy'::"text", 'degraded'::"text", 'down'::"text", 'provisioning'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."tenant_migrations" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "migration_name" "text" NOT NULL,
  "migration_version" "text" NOT NULL,
  "applied_at" timestamp with time zone DEFAULT "now"(),
  "status" "text" DEFAULT 'pending'::"text",
  "error_message" "text",
  CONSTRAINT "tenant_migrations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "tenant_migrations_tenant_id_migration_name_key" UNIQUE ("tenant_id", "migration_name"),
  CONSTRAINT "tenant_migrations_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'success'::"text", 'failed'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."company_admins" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "name" "text" NOT NULL,
  "employee_id" "text" NOT NULL,
  "email" "text" NOT NULL,
  "password_hash" "text" NOT NULL,
  "status" "text" DEFAULT 'active'::"text",
  "role" "text" DEFAULT 'CompanyAdmin'::"text",
  "last_login_at" timestamp with time zone,
  "password_reset_token" "text",
  "password_reset_expires" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "created_by" "uuid",
  CONSTRAINT "company_admins_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_admins_email_key" UNIQUE ("email"),
  CONSTRAINT "company_admins_tenant_id_employee_id_key" UNIQUE ("tenant_id", "employee_id"),
  CONSTRAINT "company_admins_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."audit_logs" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid",
  "user_id" "uuid",
  "user_type" "text",
  "action" "text" NOT NULL,
  "resource_type" "text",
  "resource_id" "uuid",
  "old_values" "jsonb",
  "new_values" "jsonb",
  "ip_address" "text",
  "user_agent" "text",
  "created_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "audit_logs_user_type_check" CHECK (("user_type" = ANY (ARRAY['SuperAdmin'::"text", 'CompanyAdmin'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."employees" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "name" "text" NOT NULL,
  "mobile" "text" NOT NULL,
  "emp_id" "text" NOT NULL,
  "password_hash" "text" NOT NULL,
  "role" "text" NOT NULL,
  "status" "text" DEFAULT 'active'::"text" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "created_by" "uuid",
  "team_id" "uuid",
  CONSTRAINT "employees_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employees_tenant_id_emp_id_key" UNIQUE ("tenant_id", "emp_id"),
  CONSTRAINT "employees_role_check" CHECK (("role" = ANY (ARRAY['TeamIncharge'::"text", 'Telecaller'::"text"]))),
  CONSTRAINT "employees_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."teams" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "name" "text" NOT NULL,
  "team_incharge_id" "uuid" NOT NULL,
  "product_name" "text" DEFAULT 'General'::"text" NOT NULL,
  "status" "text" DEFAULT 'active'::"text" NOT NULL,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "created_by" "uuid",
  CONSTRAINT "teams_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "teams_tenant_id_name_key" UNIQUE ("tenant_id", "name"),
  CONSTRAINT "teams_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'inactive'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."team_telecallers" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "team_id" "uuid" NOT NULL,
  "telecaller_id" "uuid" NOT NULL,
  "assigned_by" "uuid",
  "created_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "team_telecallers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "team_telecallers_team_id_telecaller_id_key" UNIQUE ("team_id", "telecaller_id")
);

CREATE TABLE IF NOT EXISTS "public"."telecaller_targets" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "telecaller_id" "uuid" NOT NULL,
  "daily_calls_target" integer DEFAULT 0,
  "weekly_calls_target" integer DEFAULT 0,
  "monthly_calls_target" integer DEFAULT 0,
  "daily_collections_target" numeric DEFAULT 0,
  "weekly_collections_target" numeric DEFAULT 0,
  "monthly_collections_target" numeric DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "telecaller_targets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "telecaller_targets_telecaller_id_key" UNIQUE ("telecaller_id"),
  CONSTRAINT "telecaller_targets_daily_calls_target_check" CHECK (("daily_calls_target" >= 0)),
  CONSTRAINT "telecaller_targets_daily_collections_target_check" CHECK (("daily_collections_target" >= (0)::numeric)),
  CONSTRAINT "telecaller_targets_monthly_calls_target_check" CHECK (("monthly_calls_target" >= 0)),
  CONSTRAINT "telecaller_targets_monthly_collections_target_check" CHECK (("monthly_collections_target" >= (0)::numeric)),
  CONSTRAINT "telecaller_targets_weekly_calls_target_check" CHECK (("weekly_calls_target" >= 0)),
  CONSTRAINT "telecaller_targets_weekly_collections_target_check" CHECK (("weekly_collections_target" >= (0)::numeric))
);

CREATE TABLE IF NOT EXISTS "public"."customer_cases" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "assigned_employee_id" "text" NOT NULL,
  "loan_id" "text" NOT NULL,
  "customer_name" "text" NOT NULL,
  "mobile_no" "text",
  "alternate_number" "text",
  "email" "text",
  "loan_amount" "text",
  "loan_type" "text",
  "outstanding_amount" "text",
  "pos_amount" "text",
  "emi_amount" "text",
  "pending_dues" "text",
  "dpd" integer,
  "branch_name" "text",
  "address" "text",
  "city" "text",
  "state" "text",
  "pincode" "text",
  "sanction_date" "date",
  "last_paid_date" "date",
  "last_paid_amount" "text",
  "payment_link" "text",
  "remarks" "text",
  "custom_fields" "jsonb" DEFAULT '{}'::"jsonb",
  "case_status" "text" DEFAULT 'pending'::"text",
  "priority" "text" DEFAULT 'medium'::"text",
  "uploaded_by" "uuid",
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "team_id" "uuid",
  "telecaller_id" "uuid",
  "last_call_date" timestamp with time zone,
  "next_action_date" timestamp with time zone,
  "total_collected_amount" numeric DEFAULT 0,
  "case_data" "jsonb" DEFAULT '{}'::"jsonb",
  "product_name" "text",
  "status" "text" DEFAULT 'Open'::"text",
  CONSTRAINT "customer_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_cases_tenant_id_loan_id_key" UNIQUE ("tenant_id", "loan_id"),
  CONSTRAINT "customer_cases_case_status_check" CHECK (("case_status" = ANY (ARRAY['pending'::"text", 'in_progress'::"text", 'resolved'::"text", 'closed'::"text"]))),
  CONSTRAINT "customer_cases_priority_check" CHECK (("priority" = ANY (ARRAY['low'::"text", 'medium'::"text", 'high'::"text", 'urgent'::"text"]))),
  CONSTRAINT "customer_cases_status_check" CHECK (("status" = ANY (ARRAY['Open'::"text", 'Closed'::"text", 'Pending'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."case_call_logs" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "case_id" "uuid" NOT NULL,
  "employee_id" "text" NOT NULL,
  "call_status" "text" NOT NULL,
  "ptp_date" "date",
  "call_notes" "text",
  "call_duration" integer DEFAULT 0,
  "call_result" "text",
  "created_at" timestamp with time zone DEFAULT "now"(),
  "tenant_id" "uuid",
  "callback_date" "date",
  "callback_completed" boolean DEFAULT false,
  "callback_time" time without time zone,
  "amount_collected" numeric(15,2),
  CONSTRAINT "case_call_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "amount_collected_non_negative" CHECK (("amount_collected" >= (0)::numeric)),
  CONSTRAINT "case_call_logs_call_status_check" CHECK (("call_status" = ANY (ARRAY['WN'::"text", 'SW'::"text", 'RNR'::"text", 'BUSY'::"text", 'CALL_BACK'::"text", 'PTP'::"text", 'FUTURE_PTP'::"text", 'BPTP'::"text", 'RTP'::"text", 'NC'::"text", 'CD'::"text", 'INC'::"text", 'PAYMENT_RECEIVED'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."case_views" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "case_id" "uuid" NOT NULL,
  "user_id" "text" NOT NULL,
  "viewed_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "case_views_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "case_views_case_id_user_id_key" UNIQUE ("case_id", "user_id")
);

CREATE TABLE IF NOT EXISTS "public"."viewed_case_logs" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "case_id" "uuid" NOT NULL,
  "employee_id" "uuid" NOT NULL,
  "viewed_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "viewed_case_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "viewed_case_logs_case_id_employee_id_key" UNIQUE ("case_id", "employee_id")
);

CREATE TABLE IF NOT EXISTS "public"."column_configurations" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "column_name" "text" NOT NULL,
  "display_name" "text" NOT NULL,
  "is_active" boolean DEFAULT true,
  "is_custom" boolean DEFAULT false,
  "column_order" integer DEFAULT 0,
  "data_type" "text" DEFAULT 'text'::"text",
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "product_name" "text",
  CONSTRAINT "column_configurations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "column_configurations_tenant_id_column_name_product_name_key" UNIQUE ("tenant_id", "column_name", "product_name"),
  CONSTRAINT "column_configurations_data_type_check" CHECK (("data_type" = ANY (ARRAY['text'::"text", 'number'::"text", 'date'::"text", 'phone'::"text", 'currency'::"text", 'email'::"text", 'url'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."notifications" (
  "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "sender_id" "uuid",
  "title" "text" NOT NULL,
  "message" "text" NOT NULL,
  "type" "text" NOT NULL,
  "target_type" "text" NOT NULL,
  "target_id" "uuid",
  "created_at" timestamp with time zone DEFAULT "now"(),
  "is_read" boolean DEFAULT false,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "notifications_target_type_check" CHECK (("target_type" = ANY (ARRAY['all'::"text", 'team'::"text", 'user'::"text"]))),
  CONSTRAINT "notifications_type_check" CHECK (("type" = ANY (ARRAY['info'::"text", 'warning'::"text", 'success'::"text", 'error'::"text"])))
);

CREATE TABLE IF NOT EXISTS "public"."office_settings" (
  "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "office_start_time" time without time zone DEFAULT '09:00:00'::time without time zone NOT NULL,
  "office_end_time" time without time zone DEFAULT '18:00:00'::time without time zone NOT NULL,
  "timezone" character varying(50) DEFAULT 'Asia/Kolkata'::character varying,
  "working_days" integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6],
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  CONSTRAINT "office_settings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "office_settings_tenant_id_key" UNIQUE ("tenant_id")
);

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

CREATE TABLE IF NOT EXISTS "public"."user_activity" (
  "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
  "tenant_id" "uuid" NOT NULL,
  "employee_id" "uuid" NOT NULL,
  "login_time" timestamp with time zone DEFAULT "now"() NOT NULL,
  "logout_time" timestamp with time zone,
  "last_active_time" timestamp with time zone DEFAULT "now"() NOT NULL,
  "status" character varying(20) DEFAULT 'Online'::character varying NOT NULL,
  "total_break_time" integer DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT "now"(),
  "updated_at" timestamp with time zone DEFAULT "now"(),
  "current_break_start" timestamp with time zone,
  "total_idle_time" integer DEFAULT 0,
  "logout_reason" character varying(100),
  CONSTRAINT "user_activity_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_activity_status_check" CHECK ((("status")::"text" = ANY (ARRAY[('Online'::character varying)::"text", ('Break'::character varying)::"text", ('Offline'::character varying)::"text", ('Idle'::character varying)::"text"])))
);

-- Foreign Keys
ALTER TABLE ONLY "public"."tenants"
  ADD CONSTRAINT "tenants_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."super_admins"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."tenant_databases"
  ADD CONSTRAINT "tenant_databases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."tenant_migrations"
  ADD CONSTRAINT "tenant_migrations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."company_admins"
  ADD CONSTRAINT "company_admins_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."company_admins"
  ADD CONSTRAINT "company_admins_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."super_admins"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."audit_logs"
  ADD CONSTRAINT "audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."employees"
  ADD CONSTRAINT "employees_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."employees"
  ADD CONSTRAINT "employees_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."company_admins"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."employees"
  ADD CONSTRAINT "employees_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."teams"
  ADD CONSTRAINT "teams_team_incharge_id_fkey" FOREIGN KEY ("team_incharge_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_telecallers"
  ADD CONSTRAINT "team_telecallers_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_telecallers"
  ADD CONSTRAINT "team_telecallers_telecaller_id_fkey" FOREIGN KEY ("telecaller_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."team_telecallers"
  ADD CONSTRAINT "team_telecallers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."employees"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."telecaller_targets"
  ADD CONSTRAINT "telecaller_targets_telecaller_id_fkey" FOREIGN KEY ("telecaller_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."customer_cases"
  ADD CONSTRAINT "customer_cases_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."customer_cases"
  ADD CONSTRAINT "customer_cases_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."customer_cases"
  ADD CONSTRAINT "customer_cases_telecaller_id_fkey" FOREIGN KEY ("telecaller_id") REFERENCES "public"."employees"("id") ON DELETE SET NULL;

ALTER TABLE ONLY "public"."case_call_logs"
  ADD CONSTRAINT "case_call_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."customer_cases"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."case_call_logs"
  ADD CONSTRAINT "case_call_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."case_views"
  ADD CONSTRAINT "case_views_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."customer_cases"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."viewed_case_logs"
  ADD CONSTRAINT "viewed_case_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "public"."customer_cases"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."viewed_case_logs"
  ADD CONSTRAINT "viewed_case_logs_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."column_configurations"
  ADD CONSTRAINT "column_configurations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."notifications"
  ADD CONSTRAINT "notifications_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."office_settings"
  ADD CONSTRAINT "office_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."security_audit_logs"
  ADD CONSTRAINT "security_audit_logs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_activity"
  ADD CONSTRAINT "user_activity_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE CASCADE;

ALTER TABLE ONLY "public"."user_activity"
  ADD CONSTRAINT "user_activity_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE CASCADE;

-- Indexes
CREATE INDEX IF NOT EXISTS "idx_super_admins_username" ON "public"."super_admins" USING "btree" ("username");
CREATE INDEX IF NOT EXISTS "idx_tenants_status" ON "public"."tenants" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_tenants_created_by" ON "public"."tenants" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_tenants_slug" ON "public"."tenants" USING "btree" ("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_tenants_subdomain_lower" ON "public"."tenants" USING "btree" ("lower"("subdomain"));
CREATE INDEX IF NOT EXISTS "idx_tenants_subdomain_status" ON "public"."tenants" USING "btree" ("lower"("subdomain"), "status");
CREATE INDEX IF NOT EXISTS "idx_tenant_databases_tenant_id" ON "public"."tenant_databases" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_databases_status" ON "public"."tenant_databases" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_tenant_migrations_tenant_id" ON "public"."tenant_migrations" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_tenant_migrations_status" ON "public"."tenant_migrations" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_company_admins_tenant_id" ON "public"."company_admins" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_company_admins_email" ON "public"."company_admins" USING "btree" ("email");
CREATE INDEX IF NOT EXISTS "idx_company_admins_status" ON "public"."company_admins" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant_id" ON "public"."audit_logs" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user_id" ON "public"."audit_logs" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created_at" ON "public"."audit_logs" USING "btree" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_employees_tenant_id" ON "public"."employees" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_employees_emp_id" ON "public"."employees" USING "btree" ("emp_id");
CREATE INDEX IF NOT EXISTS "idx_employees_mobile" ON "public"."employees" USING "btree" ("mobile");
CREATE INDEX IF NOT EXISTS "idx_employees_role" ON "public"."employees" USING "btree" ("role");
CREATE INDEX IF NOT EXISTS "idx_employees_status" ON "public"."employees" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_employees_created_by" ON "public"."employees" USING "btree" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_employees_team_id" ON "public"."employees" USING "btree" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_teams_tenant_id" ON "public"."teams" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_teams_team_incharge_id" ON "public"."teams" USING "btree" ("team_incharge_id");
CREATE INDEX IF NOT EXISTS "idx_teams_product_name" ON "public"."teams" USING "btree" ("product_name");
CREATE INDEX IF NOT EXISTS "idx_teams_status" ON "public"."teams" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_team_telecallers_team_id" ON "public"."team_telecallers" USING "btree" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_team_telecallers_telecaller_id" ON "public"."team_telecallers" USING "btree" ("telecaller_id");
CREATE INDEX IF NOT EXISTS "idx_telecaller_targets_telecaller_id" ON "public"."telecaller_targets" USING "btree" ("telecaller_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_tenant" ON "public"."customer_cases" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_employee" ON "public"."customer_cases" USING "btree" ("tenant_id", "assigned_employee_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_loan_id" ON "public"."customer_cases" USING "btree" ("tenant_id", "loan_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_status" ON "public"."customer_cases" USING "btree" ("case_status");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_team_id" ON "public"."customer_cases" USING "btree" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_telecaller_id" ON "public"."customer_cases" USING "btree" ("telecaller_id");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_next_action_date" ON "public"."customer_cases" USING "btree" ("next_action_date");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_dpd" ON "public"."customer_cases" USING "btree" ("dpd");
CREATE INDEX IF NOT EXISTS "idx_customer_cases_product_name" ON "public"."customer_cases" USING "btree" ("product_name");
CREATE INDEX IF NOT EXISTS "idx_call_logs_case" ON "public"."case_call_logs" USING "btree" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_call_logs_employee" ON "public"."case_call_logs" USING "btree" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_call_logs_tenant" ON "public"."case_call_logs" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_call_logs_created" ON "public"."case_call_logs" USING "btree" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_call_logs_callback_date" ON "public"."case_call_logs" USING "btree" ("callback_date");
CREATE INDEX IF NOT EXISTS "idx_case_views_case_id" ON "public"."case_views" USING "btree" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_case_views_user_id" ON "public"."case_views" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_case_views_viewed_at" ON "public"."case_views" USING "btree" ("viewed_at");
CREATE INDEX IF NOT EXISTS "idx_viewed_case_logs_case" ON "public"."viewed_case_logs" USING "btree" ("case_id");
CREATE INDEX IF NOT EXISTS "idx_viewed_case_logs_employee" ON "public"."viewed_case_logs" USING "btree" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_viewed_case_logs_viewed_at" ON "public"."viewed_case_logs" USING "btree" ("viewed_at");
CREATE INDEX IF NOT EXISTS "idx_column_config_tenant" ON "public"."column_configurations" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_column_config_active" ON "public"."column_configurations" USING "btree" ("tenant_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_column_config_order" ON "public"."column_configurations" USING "btree" ("tenant_id", "column_order");
CREATE INDEX IF NOT EXISTS "idx_column_config_product_name" ON "public"."column_configurations" USING "btree" ("tenant_id", "product_name");
CREATE INDEX IF NOT EXISTS "idx_notifications_tenant_id" ON "public"."notifications" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_target_id" ON "public"."notifications" USING "btree" ("target_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_office_settings_tenant_id" ON "public"."office_settings" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_tenant" ON "public"."security_audit_logs" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_user" ON "public"."security_audit_logs" USING "btree" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_event_type" ON "public"."security_audit_logs" USING "btree" ("event_type");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_created" ON "public"."security_audit_logs" USING "btree" ("created_at" DESC);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_success" ON "public"."security_audit_logs" USING "btree" ("success") WHERE ("success" = false);
CREATE INDEX IF NOT EXISTS "idx_user_activity_tenant_id" ON "public"."user_activity" USING "btree" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_user_activity_employee_id" ON "public"."user_activity" USING "btree" ("employee_id");
CREATE INDEX IF NOT EXISTS "idx_user_activity_status" ON "public"."user_activity" USING "btree" ("status");
CREATE INDEX IF NOT EXISTS "idx_user_activity_logout_time" ON "public"."user_activity" USING "btree" ("logout_time") WHERE ("logout_time" IS NULL);

-- Triggers
CREATE OR REPLACE TRIGGER "trigger_normalize_validate_subdomain_insert" 
  BEFORE INSERT ON "public"."tenants" 
  FOR EACH ROW EXECUTE FUNCTION "public"."normalize_and_validate_subdomain"();

CREATE OR REPLACE TRIGGER "trigger_normalize_validate_subdomain_update" 
  BEFORE UPDATE OF "subdomain" ON "public"."tenants" 
  FOR EACH ROW EXECUTE FUNCTION "public"."normalize_and_validate_subdomain"();

CREATE OR REPLACE TRIGGER "update_super_admins_updated_at" 
  BEFORE UPDATE ON "public"."super_admins" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_tenants_updated_at" 
  BEFORE UPDATE ON "public"."tenants" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_tenant_databases_updated_at" 
  BEFORE UPDATE ON "public"."tenant_databases" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_company_admins_updated_at" 
  BEFORE UPDATE ON "public"."company_admins" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_employees_updated_at" 
  BEFORE UPDATE ON "public"."employees" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_teams_updated_at" 
  BEFORE UPDATE ON "public"."teams" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_telecaller_targets_updated_at" 
  BEFORE UPDATE ON "public"."telecaller_targets" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_customer_cases_updated_at" 
  BEFORE UPDATE ON "public"."customer_cases" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "update_column_configurations_updated_at" 
  BEFORE UPDATE ON "public"."column_configurations" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();

CREATE OR REPLACE TRIGGER "user_activity_updated_at" 
  BEFORE UPDATE ON "public"."user_activity" 
  FOR EACH ROW EXECUTE FUNCTION "public"."update_user_activity_updated_at"();

-- Enable RLS
ALTER TABLE "public"."super_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tenant_databases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."tenant_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."company_admins" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."security_audit_logs" ENABLE ROW LEVEL SECURITY;

-- RLS Policies (for custom auth system)
CREATE POLICY "Allow anonymous select for authentication" ON "public"."super_admins" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow insert for super admins" ON "public"."super_admins" FOR INSERT TO "authenticated", "anon" WITH CHECK (true);

CREATE POLICY "Allow anon read access to tenants" ON "public"."tenants" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon insert access to tenants" ON "public"."tenants" FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Allow anon update access to tenants" ON "public"."tenants" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access to tenants" ON "public"."tenants" FOR DELETE TO "anon" USING (true);

CREATE POLICY "Allow anon read access to tenant databases" ON "public"."tenant_databases" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon insert access to tenant databases" ON "public"."tenant_databases" FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Allow anon update access to tenant databases" ON "public"."tenant_databases" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access to tenant databases" ON "public"."tenant_databases" FOR DELETE TO "anon" USING (true);

CREATE POLICY "Allow anon read access to tenant migrations" ON "public"."tenant_migrations" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon insert access to tenant migrations" ON "public"."tenant_migrations" FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Allow anon update access to tenant migrations" ON "public"."tenant_migrations" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon read access to company admins" ON "public"."company_admins" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon insert access to company admins" ON "public"."company_admins" FOR INSERT TO "anon" WITH CHECK (true);
CREATE POLICY "Allow anon update access to company admins" ON "public"."company_admins" FOR UPDATE TO "anon" USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access to company admins" ON "public"."company_admins" FOR DELETE TO "anon" USING (true);

CREATE POLICY "Allow anon read access to audit logs" ON "public"."audit_logs" FOR SELECT TO "anon" USING (true);
CREATE POLICY "Allow anon insert access to audit logs" ON "public"."audit_logs" FOR INSERT TO "anon" WITH CHECK (true);

CREATE POLICY "Allow insert audit logs" ON "public"."security_audit_logs" FOR INSERT TO "anon" WITH CHECK (true);
