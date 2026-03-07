-- 20260121_performance_stats_rpc.sql
-- Optimizes Performance Dashboard by aggregating stats on the server.
-- Handles 50,000+ cases efficiently using server-side SQL.

CREATE OR REPLACE FUNCTION get_performance_stats_v3(
    p_tenant_id UUID,
    p_team_id UUID DEFAULT NULL,
    p_telecaller_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_total_cases INT;
    v_total_collected NUMERIC;
    v_status_distribution JSONB;
BEGIN
    -- 1. Total Cases matching filters
    SELECT COUNT(*)
    INTO v_total_cases
    FROM customer_cases
    WHERE tenant_id = p_tenant_id
    AND (p_team_id IS NULL OR team_id = p_team_id)
    AND (p_telecaller_id IS NULL OR telecaller_id = p_telecaller_id)
    AND case_status != 'deleted'; -- Exclude deleted cases

    -- 2. Total Collected matching filters
    SELECT COALESCE(SUM(amount_collected::NUMERIC), 0)
    INTO v_total_collected
    FROM case_call_logs l
    JOIN customer_cases c ON l.case_id = c.id
    WHERE l.tenant_id = p_tenant_id
    AND (l.amount_collected::NUMERIC > 0)
    AND (p_team_id IS NULL OR c.team_id = p_team_id)
    AND (p_telecaller_id IS NULL OR c.telecaller_id = p_telecaller_id);

    -- 3. Status Distribution (fetching latest status for each filtered case)
    WITH filtered_cases AS (
        SELECT id
        FROM customer_cases
        WHERE tenant_id = p_tenant_id
        AND (p_team_id IS NULL OR team_id = p_team_id)
        AND (p_telecaller_id IS NULL OR telecaller_id = p_telecaller_id)
        AND case_status != 'deleted'
    ),
    latest_logs AS (
        SELECT DISTINCT ON (l.case_id)
            l.case_id,
            l.call_status
        FROM case_call_logs l
        WHERE l.tenant_id = p_tenant_id
        AND l.case_id IN (SELECT id FROM filtered_cases)
        ORDER BY l.case_id, l.created_at DESC
    ),
    status_counts AS (
        SELECT 
            COALESCE(ll.call_status, 'Uncalled') as status,
            COUNT(*) as count
        FROM filtered_cases fc
        LEFT JOIN latest_logs ll ON fc.id = ll.case_id
        GROUP BY COALESCE(ll.call_status, 'Uncalled')
    )
    SELECT jsonb_agg(jsonb_build_object('status', status, 'count', count))
    INTO v_status_distribution
    FROM status_counts;

    RETURN jsonb_build_object(
        'totalCases', v_total_cases,
        'totalCollected', v_total_collected,
        'statusDistribution', COALESCE(v_status_distribution, '[]'::jsonb)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
