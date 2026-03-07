-- Migration: Setup Table Partitioning for case_call_logs
-- Created: 2026-01-12
-- NOTE: This script will rename the existing 'case_call_logs' table and create a new partitioned one.
-- It involves moving data. Run this only during maintenance windows.

BEGIN;

-- 1. Rename existing table
ALTER TABLE IF EXISTS public.case_call_logs RENAME TO case_call_logs_old;

-- 2. Create the Parent Partitioned Table
CREATE TABLE IF NOT EXISTS public.case_call_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    case_id uuid NOT NULL,
    employee_id text NOT NULL,
    call_status text NOT NULL,
    ptp_date date,
    call_notes text,
    call_duration integer DEFAULT 0,
    call_result text,
    created_at timestamp with time zone DEFAULT now(),
    tenant_id uuid,
    callback_date date,
    callback_completed boolean DEFAULT false,
    callback_time time without time zone,
    amount_collected numeric(15,2),
    
    -- Constraints (Primary Key must include partition key 'created_at')
    CONSTRAINT case_call_logs_pkey PRIMARY KEY (id, created_at),
    CONSTRAINT amount_collected_non_negative CHECK (amount_collected >= 0::numeric)
) PARTITION BY RANGE (created_at);

-- 3. Create Partitions (Monthly)
-- Past & Current Months
CREATE TABLE IF NOT EXISTS case_call_logs_2025_12 PARTITION OF case_call_logs
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

CREATE TABLE IF NOT EXISTS case_call_logs_2026_01 PARTITION OF case_call_logs
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS case_call_logs_2026_02 PARTITION OF case_call_logs
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS case_call_logs_2026_03 PARTITION OF case_call_logs
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- Catch-all for older/future data (Temporary safety net)
CREATE TABLE IF NOT EXISTS case_call_logs_default PARTITION OF case_call_logs DEFAULT;

-- 4. Re-apply Indexes on the Partitioned Table
CREATE INDEX idx_call_logs_case ON public.case_call_logs USING btree (case_id);
CREATE INDEX idx_call_logs_employee ON public.case_call_logs USING btree (employee_id);
CREATE INDEX idx_call_logs_tenant ON public.case_call_logs USING btree (tenant_id);
CREATE INDEX idx_call_logs_created ON public.case_call_logs USING btree (created_at);
CREATE INDEX idx_call_logs_callback_date ON public.case_call_logs USING btree (callback_date);

-- Composite index from Optimization Plan
CREATE INDEX idx_call_logs_created_tenant_composite ON public.case_call_logs (created_at DESC, tenant_id);


-- 5. Migrate Data from Old Table
-- This might take time if the table is huge. 
INSERT INTO case_call_logs (
    id, case_id, employee_id, call_status, ptp_date, call_notes, 
    call_duration, call_result, created_at, tenant_id, callback_date, 
    callback_completed, callback_time, amount_collected
)
SELECT 
    id, case_id, employee_id, call_status, ptp_date, call_notes, 
    call_duration, call_result, created_at, tenant_id, callback_date, 
    callback_completed, callback_time, amount_collected
FROM case_call_logs_old;

-- 6. Enable RLS and Re-apply Policies
ALTER TABLE public.case_call_logs ENABLE ROW LEVEL SECURITY;

-- Note: We need to recreate policies. Copying generic ones here.
CREATE POLICY "Allow anon read access to case_call_logs" ON public.case_call_logs FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert access to case_call_logs" ON public.case_call_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update access to case_call_logs" ON public.case_call_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete access to case_call_logs" ON public.case_call_logs FOR DELETE TO anon USING (true);

COMMIT;
