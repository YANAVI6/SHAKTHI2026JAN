-- Pre-Migration Verification Script
-- Run this BEFORE applying migrations to capture baseline metrics

\echo '=== PRE-MIGRATION VERIFICATION ==='
\echo ''

\echo '1. Current Schema Check'
SELECT 
    column_name, 
    data_type,
    character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'customer_cases' 
AND column_name IN ('loan_amount', 'outstanding_amount', 'emi_amount', 'pos_amount', 'pending_dues', 'last_paid_amount')
ORDER BY column_name;

\echo ''
\echo '2. Row Counts'
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
\echo '3. Sample Data Check (first 5 rows)'
SELECT 
    id,
    loan_id,
    loan_amount,
    outstanding_amount,
    emi_amount
FROM customer_cases
LIMIT 5;

\echo ''
\echo '4. Existing Indexes on case_call_logs'
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'case_call_logs'
ORDER BY indexname;

\echo ''
\echo '5. Check for pg_cron extension'
SELECT 
    name,
    installed_version,
    comment
FROM pg_available_extensions
WHERE name = 'pg_cron';

\echo ''
\echo '6. Current RPC Function'
SELECT 
    routine_name,
    routine_type,
    data_type
FROM information_schema.routines
WHERE routine_name = 'get_live_monitoring_stats';

\echo ''
\echo '=== BASELINE CAPTURED ==='
\echo 'Save this output for comparison after migration'
