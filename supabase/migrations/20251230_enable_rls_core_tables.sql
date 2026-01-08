-- SECURITY FIX: Enable RLS on core tables
-- Remediation for lint warning: policy_exists_rls_disabled
-- Ensures that the policies we just created are actually enforced.

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
