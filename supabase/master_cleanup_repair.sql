-- MASTER CLEANUP & REPAIR SCRIPT 
-- RUN THIS IN SUPABASE SQL EDITOR TO FIX 409 CONFLICTS AND 400 BAD REQUESTS

-- 1. FIX TYPE MISMATCHES AND FOREIGN KEYS (ESSENTIAL FOR JOINS)

-- A. customer_cases
DO $$ 
BEGIN 
    -- Convert assigned_employee_id to uuid if it is text
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'assigned_employee_id') = 'text' THEN
        ALTER TABLE customer_cases ALTER COLUMN assigned_employee_id TYPE uuid USING (assigned_employee_id::uuid);
    END IF;
    
    -- Add secondary mobile column if missing (logic from previous turns)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customer_cases' AND column_name = 'alternate_number') THEN
        ALTER TABLE customer_cases ADD COLUMN alternate_number text;
    END IF;
END $$;

-- B. case_call_logs
DO $$ 
BEGIN 
    -- Convert employee_id to uuid
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'employee_id') = 'text' THEN
        ALTER TABLE case_call_logs ALTER COLUMN employee_id TYPE uuid USING (employee_id::uuid);
    END IF;

    -- Add Foreign Keys if missing
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'case_call_logs_employee_id_fkey') THEN
        ALTER TABLE case_call_logs ADD CONSTRAINT case_call_logs_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. FIX user_activity (Deduplicate and Add Constraint)
DELETE FROM user_activity a USING user_activity b
WHERE a.created_at < b.created_at
  AND a.tenant_id = b.tenant_id
  AND a.employee_id = b.employee_id;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_activity_tenant_employee_unique') THEN
        ALTER TABLE user_activity ADD CONSTRAINT user_activity_tenant_employee_unique UNIQUE (tenant_id, employee_id);
    END IF;
END $$;

-- 3. FIX chat_channels (Deduplicate and Add Constraint)
DELETE FROM chat_channels a USING chat_channels b
WHERE a.created_at < b.created_at
  AND a.tenant_id = b.tenant_id
  AND a.name = b.name
  AND a.type = b.type;

DO $$ 
BEGIN 
    -- Ensure UNIQUE constraint matches what ChatService expects
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_channels_tenant_name_type_key') THEN
        ALTER TABLE chat_channels ADD CONSTRAINT chat_channels_tenant_name_type_key UNIQUE (tenant_id, name, type);
    END IF;
END $$;

-- 4. FIX chat_channel_members (Deduplicate and Add Constraint)
DELETE FROM chat_channel_members a USING chat_channel_members b
WHERE a.joined_at < b.joined_at
  AND a.channel_id = b.channel_id
  AND a.user_id = b.user_id;

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chat_channel_members_channel_user_unique') THEN
        ALTER TABLE chat_channel_members ADD CONSTRAINT chat_channel_members_channel_user_unique UNIQUE (channel_id, user_id);
    END IF;
END $$;

-- 5. FIX employees TABLE (Roll, Columns, and Constraints)
DO $$ 
BEGIN 
    -- Add missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'email') THEN
        ALTER TABLE employees ADD COLUMN email text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'employees' AND column_name = 'avatar_url') THEN
        ALTER TABLE employees ADD COLUMN avatar_url text;
    END IF;

    -- Drop existing role constraint if it exists to allow CompanyAdmin and Admin
    ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
    ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('TeamIncharge', 'Telecaller', 'CompanyAdmin', 'Admin'));
END $$;

-- 6. ENSURE COMPANY ADMINS ARE SYNCED TO EMPLOYEES (CRITICAL FOR CHAT FK)
DO $$ 
BEGIN 
    -- Initial sync for existing admins - matches 20260102 migration logic
    DELETE FROM public.employees e
    USING public.company_admins ca
    WHERE e.tenant_id = ca.tenant_id 
      AND e.emp_id = ca.employee_id 
      AND e.id != ca.id;

    INSERT INTO public.employees (
        id,
        tenant_id,
        name,
        emp_id,
        role,
        status,
        password_hash,
        mobile,
        email,
        created_at,
        updated_at
    )
    SELECT
        ca.id,
        ca.tenant_id,
        ca.name,
        ca.employee_id,
        'CompanyAdmin',
        'active',
        ca.password_hash,
        ca.employee_id,
        ca.email,
        ca.created_at,
        ca.updated_at
    FROM public.company_admins ca
    ON CONFLICT (id) DO UPDATE SET
        tenant_id = EXCLUDED.tenant_id,
        name = EXCLUDED.name,
        emp_id = EXCLUDED.emp_id,
        password_hash = EXCLUDED.password_hash,
        email = EXCLUDED.email,
        updated_at = EXCLUDED.updated_at;
END $$;

-- 7. FIX case_call_logs SCHEMA (Column Names and Types)
DO $$ 
BEGIN 
    -- callback_datetime
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'callback_date') THEN
        ALTER TABLE case_call_logs RENAME COLUMN callback_date TO callback_datetime;
        ALTER TABLE case_call_logs ALTER COLUMN callback_datetime TYPE timestamptz USING callback_datetime::timestamptz;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'callback_datetime') THEN
        ALTER TABLE case_call_logs ADD COLUMN callback_datetime timestamptz;
    END IF;

    -- ptp_datetime
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'ptp_date') THEN
        ALTER TABLE case_call_logs RENAME COLUMN ptp_date TO ptp_datetime;
        ALTER TABLE case_call_logs ALTER COLUMN ptp_datetime TYPE timestamptz USING ptp_datetime::timestamptz;
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'ptp_datetime') THEN
        ALTER TABLE case_call_logs ADD COLUMN ptp_datetime timestamptz;
    END IF;

    -- amount_collected (Change to Numeric)
    IF (SELECT data_type FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'amount_collected') = 'text' THEN
        ALTER TABLE case_call_logs ALTER COLUMN amount_collected TYPE numeric(15,2) USING (NULLIF(amount_collected, '')::numeric);
    END IF;

    -- Remove unused callback_time if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'case_call_logs' AND column_name = 'callback_time') THEN
        ALTER TABLE case_call_logs DROP COLUMN callback_time;
    END IF;
END $$;
