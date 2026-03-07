# Database Optimization Deployment Guide
**Date**: 2026-01-19  
**Target**: Production VPS Database

## Pre-Flight Checklist

### 1. Backup Database
```bash
# SSH into your VPS
ssh root@your-vps-ip

# Create backup
pg_dump -U postgres -d postgres > /root/backup_before_optimization_$(date +%Y%m%d_%H%M%S).sql
```

### 2. Verify Current State
```sql
-- Check current data types
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_cases' 
AND column_name IN ('loan_amount', 'outstanding_amount', 'emi_amount');

-- Check row counts
SELECT 
    (SELECT COUNT(*) FROM customer_cases) as total_cases,
    (SELECT COUNT(*) FROM case_call_logs) as total_logs;
```

## Migration Execution Order

### Step 1: Schema Type Fixes (5-10 minutes)
**File**: `20260112_schema_type_fixes.sql`

```bash
# Connect to database
psql -U postgres -d postgres

# Execute migration
\i /path/to/supabase/migrations/20260112_schema_type_fixes.sql

# Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'customer_cases' 
AND column_name IN ('loan_amount', 'outstanding_amount', 'emi_amount');
```

**Expected Result**: All three columns should show `numeric` type.

---

### Step 2: Table Partitioning (15-30 minutes)
**File**: `20260112_partitioning_setup.sql`

> ⚠️ **WARNING**: This step renames the existing table and migrates data. Ensure no users are active.

```bash
# Execute migration
\i /path/to/supabase/migrations/20260112_partitioning_setup.sql

# Verify partitions created
SELECT 
    parent.relname AS parent_table,
    child.relname AS partition_name
FROM pg_inherits
JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
JOIN pg_class child ON pg_inherits.inhrelid = child.oid
WHERE parent.relname = 'case_call_logs';
```

**Expected Result**: Should show partitions like `case_call_logs_2026_01`, `case_call_logs_2026_02`, etc.

---

### Step 3: RPC Optimization (1-2 minutes)
**File**: `20260112_optimize_rpc.sql`

```bash
# Execute migration
\i /path/to/supabase/migrations/20260112_optimize_rpc.sql

# Test the function
SELECT get_live_monitoring_stats(
    'your-tenant-id'::uuid,
    ARRAY['team-id-1'::uuid, 'team-id-2'::uuid]
);
```

**Expected Result**: Should return JSON with team stats in under 500ms.

---

### Step 4: Retention Policy (1 minute)
**File**: `20260112_retention_policy.sql`

> ℹ️ **NOTE**: Requires `pg_cron` extension.

```bash
# Check if pg_cron is available
SELECT * FROM pg_available_extensions WHERE name = 'pg_cron';

# Execute migration
\i /path/to/supabase/migrations/20260112_retention_policy.sql

# Verify cron job created
SELECT * FROM cron.job WHERE jobname = 'daily_data_cleanup_45days';
```

**Expected Result**: Should show the scheduled job.

---

## Post-Deployment Verification

### 1. Data Integrity Check
```sql
-- Verify no data loss
SELECT 
    (SELECT COUNT(*) FROM customer_cases) as cases_after,
    (SELECT COUNT(*) FROM case_call_logs) as logs_after;

-- Compare with pre-migration counts
```

### 2. Performance Test
```sql
-- Test Live Monitoring speed
EXPLAIN ANALYZE 
SELECT get_live_monitoring_stats(
    'your-tenant-id'::uuid,
    ARRAY['team-id'::uuid]
);
```

**Target**: Execution time should be under 500ms for 10k cases.

### 3. Frontend Test
- Open Live Monitoring dashboard
- Verify all telecallers show correctly
- Expand case details
- Check for any errors in browser console

---

## Rollback Procedures

### If Schema Migration Fails
```sql
-- Restore from backup
psql -U postgres -d postgres < /root/backup_before_optimization_*.sql
```

### If Partitioning Fails
```sql
BEGIN;
-- Drop partitioned table
DROP TABLE IF EXISTS case_call_logs CASCADE;

-- Restore old table
ALTER TABLE case_call_logs_old RENAME TO case_call_logs;

-- Recreate indexes
CREATE INDEX idx_call_logs_case ON case_call_logs(case_id);
CREATE INDEX idx_call_logs_created ON case_call_logs(created_at);

COMMIT;
```

---

## Expected Performance Improvements

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Live Monitoring Load Time | 5-10s | 0.5-1s | **10x faster** |
| Dashboard Query Time | 2-5s | 0.2-0.5s | **10x faster** |
| Disk Usage (45 days) | Growing | Stable ~60GB | **Auto-managed** |
| Index Size | Large | Optimized | **40% smaller** |

---

## Support Capacity

With these optimizations:
- **Safe Zone**: 25-30 tenants (2,500-3,000 users)
- **Stretch Zone**: 40-50 tenants (4,000-5,000 users)
- **Storage**: 200GB sufficient for 100+ tenants with 45-day retention

---

## Troubleshooting

### Issue: "column does not exist" after schema fix
**Solution**: Reload PostgREST schema cache
```sql
NOTIFY pgrst, 'reload schema';
```

### Issue: Partitioning migration takes too long
**Solution**: Run during off-hours. For very large tables (>1M rows), consider batched migration.

### Issue: pg_cron not available
**Solution**: Install extension or use system cron instead:
```bash
# Add to crontab
0 3 * * * psql -U postgres -d postgres -c "SELECT maintain_45day_retention();"
```
