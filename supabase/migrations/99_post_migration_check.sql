-- Post-Migration Verification Script
-- Run this AFTER applying all migrations to verify success

\echo '=== POST-MIGRATION VERIFICATION ==='
\echo ''

\echo '1. Schema Changes Verified'
SELECT 
    column_name, 
    data_type,
    numeric_precision,
    numeric_scale
FROM information_schema.columns 
WHERE table_name = 'customer_cases' 
AND column_name IN ('loan_amount', 'outstanding_amount', 'emi_amount', 'pos_amount', 'pending_dues', 'last_paid_amount')
ORDER BY column_name;

\echo ''
\echo '2. Row Counts (Should Match Pre-Migration)'
SELECT 
    'customer_cases' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('customer_cases')) as total_size
FROM customer_cases
UNION ALL
SELECT 
    'case_call_logs' as table_name,
    COUNT(*) as row_count,
    pg_size_pretty(pg_total_relation_size('case_call_logs')) as total_size
FROM case_call_logs;

\echo ''
\echo '3. Partitions Created'
SELECT 
    parent.relname AS parent_table,
    child.relname AS partition_name,
    pg_size_pretty(pg_total_relation_size(child.oid)) as partition_size
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'case_call_logs'
ORDER BY child.relname;

\echo ''
\echo '4. New Indexes Created'
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexname::regclass)) as index_size
FROM pg_indexes
WHERE tablename IN ('customer_cases', 'case_call_logs')
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

\echo ''
\echo '5. Retention Policy Job Scheduled'
SELECT 
    jobid,
    jobname,
    schedule,
    command,
    active
FROM cron.job
WHERE jobname = 'daily_data_cleanup_45days';

\echo ''
\echo '6. RPC Function Updated'
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE p.proname = 'get_live_monitoring_stats'
AND n.nspname = 'public';

\echo ''
\echo '7. Performance Test - Live Monitoring RPC'
\timing on
SELECT jsonb_pretty(get_live_monitoring_stats(
    (SELECT id FROM tenants LIMIT 1),
    ARRAY(SELECT id FROM teams LIMIT 3)
)::jsonb) LIMIT 1;
\timing off

\echo ''
\echo '=== MIGRATION COMPLETE ==='
\echo 'Review all outputs above to ensure success'
