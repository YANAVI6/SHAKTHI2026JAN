-- Migration: Optimize Live Monitoring RPC (Non-Breaking)
-- Created: 2026-01-12

CREATE OR REPLACE FUNCTION get_live_monitoring_stats(
  p_tenant_id UUID,
  p_team_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
  today_start TIMESTAMPTZ;
BEGIN
  -- Set start of day for efficient range scanning
  today_start := date_trunc('day', NOW());
  
  -- Optimization: Use Common Table Expressions (CTEs)
  -- Step 1: Fetch raw logs for today first (Filtering by Time is fast with Partitioning)
  WITH today_logs AS (
    SELECT 
      ccl.case_id,
      ccl.employee_id,
      ccl.call_status,
      ccl.created_at,
      -- Use Window Function to rank calls per case/agent ONCE
      ROW_NUMBER() OVER (PARTITION BY ccl.case_id, ccl.employee_id ORDER BY ccl.created_at DESC) as rn,
      COUNT(*) OVER (PARTITION BY ccl.case_id, ccl.employee_id) as total_calls_for_pair
    FROM case_call_logs ccl
    WHERE ccl.tenant_id = p_tenant_id -- Partition Pruning 1
      AND ccl.created_at >= today_start -- Partition Pruning 2
  ),
  -- Step 2: Keep only the LATEST call per case/agent pair
  unique_today_logs AS (
    SELECT 
        tl.case_id,
        tl.employee_id,
        tl.call_status,
        tl.created_at,
        tl.total_calls_for_pair
    FROM today_logs tl
    WHERE tl.rn = 1
  ),
  -- Step 3: Join with Customer Cases to get details (Only for the active distinct cases)
  active_cases_details AS (
    SELECT 
      ul.employee_id,
      cc.team_id,
      cc.id as case_id,
      cc.loan_id,
      cc.customer_name,
      cc.mobile_no,
      ul.call_status,
      ul.created_at as last_call_time,
      ul.total_calls_for_pair as call_count,
      cc.case_status,
      cc.dpd,
      COALESCE(cc.pos_amount, 0) as pos, -- Safe safe-casting
      COALESCE(cc.emi_amount, 0) as emi,
      cc.priority
    FROM unique_today_logs ul
    INNER JOIN customer_cases cc ON ul.case_id = cc.id
    WHERE cc.tenant_id = p_tenant_id
      AND cc.team_id = ANY(p_team_ids)
  ),
  -- Step 4: Aggregate Stats per Telecaller
  telecaller_stats AS (
    SELECT 
      e.id as telecaller_id,
      e.name as telecaller_name,
      t.id as team_id,
      t.name as team_name,
      COUNT(DISTINCT acd.case_id) as live_cases,
      COUNT(CASE WHEN acd.call_status IN ('PTP', 'PAID', 'BPTP', 'payment_received') THEN 1 END) as completed_today,
      -- JSON Aggregation (Keeping the EXACT structure required by frontend)
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', acd.case_id,
          'loanId', acd.loan_id,
          'customerName', acd.customer_name,
          'mobileNo', acd.mobile_no,
          'callStatus', acd.call_status,
          'lastCallTime', to_char(acd.last_call_time, 'HH24:MI:SS'),
          'callCount', acd.call_count,
          'caseStatus', acd.case_status,
          'dpd', acd.dpd,
          'pos', acd.pos,
          'emi', acd.emi,
          'priority', acd.priority
        ) ORDER BY acd.last_call_time DESC
      ) FILTER (WHERE acd.case_id IS NOT NULL) as cases_details
    FROM employees e
    INNER JOIN teams t ON e.team_id = t.id -- More efficient join direction
    LEFT JOIN active_cases_details acd ON e.id = acd.employee_id
    WHERE e.tenant_id = p_tenant_id
      AND e.role = 'Telecaller'
      AND t.id = ANY(p_team_ids)
      AND e.status = 'active'
    GROUP BY e.id, e.name, t.id, t.name
  ),
  -- Step 5: Get Total Assigned Cases (Separate optimized query)
  total_assigned AS (
    SELECT 
        telecaller_id, 
        COUNT(*) as total_count 
    FROM customer_cases 
    WHERE tenant_id = p_tenant_id 
      AND team_id = ANY(p_team_ids)
      AND case_status != 'deleted'
    GROUP BY telecaller_id
  ),
  -- Step 6: Get User Status
  latest_activity AS (
      SELECT DISTINCT ON (employee_id)
      employee_id, status, last_active_time
      FROM user_activity
      WHERE tenant_id = p_tenant_id
      ORDER BY employee_id, last_active_time DESC
  )
  -- Final Assembly
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'teamId', team_data.team_id,
      'teamName', team_data.team_name,
      'totalCases', team_data.team_total_cases,
      'liveCases', team_data.team_live_cases,
      'telecallers', team_data.telecallers_json
    )
  ) INTO result
  FROM (
      SELECT 
        ts.team_id,
        ts.team_name,
        SUM(COALESCE(ta.total_count, 0)) as team_total_cases,
        SUM(ts.live_cases) as team_live_cases,
        JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', ts.telecaller_id,
              'name', ts.telecaller_name,
              'teamName', ts.team_name,
              'totalCases', COALESCE(ta.total_count, 0),
              'liveCases', ts.live_cases,
              'completedToday', ts.completed_today,
              'lastActivity', CASE 
                WHEN la.last_active_time IS NULL THEN 'Offline'
                WHEN EXTRACT(EPOCH FROM (NOW() - la.last_active_time))/60 < 60 
                  THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - la.last_active_time))/60) || 'm ago'
                WHEN EXTRACT(EPOCH FROM (NOW() - la.last_active_time))/60 < 1440 
                  THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - la.last_active_time))/3600) || 'h ago'
                ELSE 'Offline'
              END,
              'status', COALESCE(la.status, 'Offline'),
              'casesDetails', COALESCE(ts.cases_details, '[]'::JSON)
            )
        ) as telecallers_json
      FROM telecaller_stats ts
      LEFT JOIN total_assigned ta ON ts.telecaller_id = ta.telecaller_id
      LEFT JOIN latest_activity la ON ts.telecaller_id = la.employee_id
      GROUP BY ts.team_id, ts.team_name
  ) team_data;

  RETURN COALESCE(result, '[]'::JSON);
END;
$$;
