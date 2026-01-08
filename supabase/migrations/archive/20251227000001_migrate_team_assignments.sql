-- Migration to backfill team_telecallers from employees table
-- Corrected version: Uses valid UUID from team_incharge_id

INSERT INTO team_telecallers (team_id, telecaller_id, assigned_by, created_at)
SELECT 
    e.team_id, 
    e.id as telecaller_id,
    t.team_incharge_id as assigned_by,
    NOW()
FROM employees e
JOIN teams t ON t.id = e.team_id
WHERE 
    e.role = 'Telecaller' 
    AND e.team_id IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM team_telecallers tt 
        WHERE tt.team_id = e.team_id AND tt.telecaller_id = e.id
    );

-- Log success
DO $$
DECLARE
    row_count integer;
BEGIN
    GET DIAGNOSTICS row_count = ROW_COUNT;
    RAISE NOTICE 'Migrated % telecaller assignments', row_count;
END $$;
