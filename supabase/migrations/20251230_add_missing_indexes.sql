-- PERFORMANCE FIX: Add missing indexes for Foreign Keys
-- Remediation for lint warning: unindexed_foreign_keys

-- 1. company_admins.created_by
CREATE INDEX IF NOT EXISTS idx_company_admins_created_by ON public.company_admins(created_by);

-- 2. team_telecallers.assigned_by
CREATE INDEX IF NOT EXISTS idx_team_telecallers_assigned_by ON public.team_telecallers(assigned_by);

-- NOTE regarding 'unused_index' warnings:
-- You are seeing many 'unused_index' warnings because your development database
-- likely has very little data. PostgreSQL prefers Sequential Scans over Index Scans
-- for small tables. DO NOT remove the indexes on chat_messages, employees, etc.
-- They will be critical for performance once the application has real production data.
