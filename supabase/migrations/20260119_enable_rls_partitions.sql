-- Enable RLS on all case_call_logs partition tables
-- And apply the same policies as the parent table

BEGIN;

-- Enable RLS on all partition tables
ALTER TABLE case_call_logs_2025_12 ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_call_logs_2026_01 ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_call_logs_2026_02 ENABLE ROW LEVEL SECURITY;
ALTER TABLE case_call_logs_default ENABLE ROW LEVEL SECURITY;

-- Apply the same RLS policy as parent table to all partitions
-- (Allow anon all access - matching the parent table's policy)

DROP POLICY IF EXISTS "Allow anon all" ON case_call_logs_2025_12;
CREATE POLICY "Allow anon all" ON case_call_logs_2025_12 FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all" ON case_call_logs_2026_01;
CREATE POLICY "Allow anon all" ON case_call_logs_2026_01 FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all" ON case_call_logs_2026_02;
CREATE POLICY "Allow anon all" ON case_call_logs_2026_02 FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all" ON case_call_logs_default;
CREATE POLICY "Allow anon all" ON case_call_logs_default FOR ALL TO anon USING (true) WITH CHECK (true);

COMMIT;

-- Verify RLS is enabled
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename LIKE 'case_call_logs%'
ORDER BY tablename;
