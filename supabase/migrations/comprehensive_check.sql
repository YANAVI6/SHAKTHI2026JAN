-- Comprehensive Database State Check
-- Run this to understand current state before making changes

\echo '=== 1. All case_call_logs related tables ==='
SELECT tablename, schemaname 
FROM pg_tables 
WHERE tablename LIKE 'case_call_logs%' 
ORDER BY tablename;

\echo ''
\echo '=== 2. Partitioning info for case_call_logs ==='
SELECT 
    parent.relname AS parent_table,
    child.relname AS partition_name,
    pg_get_expr(child.relpartbound, child.oid) AS partition_expression
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'case_call_logs'
ORDER BY child.relname;

\echo ''
\echo '=== 3. Foreign keys on case_call_logs (parent) ==='
SELECT 
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS definition
FROM pg_constraint 
WHERE conrelid = 'case_call_logs'::regclass
ORDER BY conname;

\echo ''
\echo '=== 4. Foreign keys on all partitions ==='
SELECT 
    c.conrelid::regclass AS table_name,
    c.conname AS constraint_name,
    c.contype AS constraint_type
FROM pg_constraint c
WHERE c.conrelid::regclass::text LIKE 'case_call_logs%'
  AND c.contype = 'f'
ORDER BY c.conrelid::regclass::text, c.conname;

\echo ''
\echo '=== 5. Indexes on case_call_logs ==='
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename LIKE 'case_call_logs%'
ORDER BY tablename, indexname;

\echo ''
\echo '=== 6. Row counts ==='
SELECT 'case_call_logs' as table_name, count(*) as row_count FROM case_call_logs
UNION ALL
SELECT 'case_call_logs_old', count(*) FROM case_call_logs_old;

\echo ''
\echo '=== 7. Sample foreign key check ==='
SELECT 
    ccl.id,
    ccl.case_id,
    EXISTS(SELECT 1 FROM customer_cases cc WHERE cc.id = ccl.case_id) as case_exists
FROM case_call_logs ccl
LIMIT 5;
