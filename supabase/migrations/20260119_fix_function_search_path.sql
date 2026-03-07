-- Fix search_path security warnings on functions
-- Set explicit search_path to prevent search path hijacking

-- Fix maintain_45day_retention function
ALTER FUNCTION maintain_45day_retention() SET search_path = public, pg_temp;

-- Fix get_live_monitoring_stats function  
ALTER FUNCTION get_live_monitoring_stats(p_tenant_id uuid) SET search_path = public, pg_temp;

-- Verify the fix
SELECT 
    n.nspname as schema,
    p.proname as function_name,
    pg_get_function_identity_arguments(p.oid) as arguments,
    p.proconfig as settings
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname IN ('maintain_45day_retention', 'get_live_monitoring_stats')
ORDER BY p.proname;
