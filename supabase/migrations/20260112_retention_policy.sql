-- Migration: 45-Day Data Retention Policy
-- Created: 2026-01-12

-- Requirement: "pg_cron" extension must be enabled.
-- If not enabled, the script will create the extension.

CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Create a function to perform the cleanup
CREATE OR REPLACE FUNCTION maintain_45day_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_logs integer;
  deleted_audits integer;
BEGIN
  -- Delete call logs older than 45 days
  -- Partitioning makes this efficient (drops old partitions roughly), but we use DELETE for precision if needed.
  -- Actually, with partitioning, we should ideally drop partitions, but for "45 days" (rolling), DELETE is safer 
  -- unless we strictly align to months. Using DELETE here for simplicity.
  DELETE FROM case_call_logs 
  WHERE created_at < NOW() - INTERVAL '45 days';
  
  GET DIAGNOSTICS deleted_logs = ROW_COUNT;
  
  -- Delete security audit logs older than 45 days
  DELETE FROM security_audit_logs 
  WHERE created_at < NOW() - INTERVAL '45 days';
  
  GET DIAGNOSTICS deleted_audits = ROW_COUNT;

  -- Log the maintenance action (optional, into standard postgres logs)
  RAISE NOTICE 'Retention Policy executed: Deleted % call logs and % audit logs.', deleted_logs, deleted_audits;
END;
$$;

-- 2. Schedule the job to run Daily at 3:00 AM
-- Remove existing job if exists to avoid duplicates
SELECT cron.unschedule('daily_data_cleanup_45days');

SELECT cron.schedule(
  'daily_data_cleanup_45days', -- Job Name
  '0 3 * * *',                 -- Schedule (3:00 AM daily)
  $$SELECT maintain_45day_retention()$$
);

-- Note: Ensure this database has permissions to use pg_cron (usually postgres or superuser).
