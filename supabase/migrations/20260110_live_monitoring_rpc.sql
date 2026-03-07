-- Live Monitoring RPC Function for Scale
-- Handles 100+ telecallers with 10,000+ daily calls efficiently

CREATE OR REPLACE FUNCTION get_live_monitoring_stats(
  p_tenant_id UUID,
  p_team_ids UUID[]
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  result JSON;
  today_start TIMESTAMPTZ;
BEGIN
  today_start := date_trunc('day', NOW());
  
  WITH today_calls AS (
    SELECT 
      ccl.case_id,
      ccl.employee_id,
      ccl.call_status,
      ccl.created_at,
      cc.team_id,
      cc.loan_id,
      cc.customer_name,
      cc.mobile_no,
      cc.case_status,
      cc.dpd,
      cc.outstanding_amount,
      cc.emi_amount,
      cc.priority,
      ROW_NUMBER() OVER (PARTITION BY ccl.case_id, ccl.employee_id ORDER BY ccl.created_at DESC) as rn
    FROM case_call_logs ccl
    INNER JOIN customer_cases cc ON ccl.case_id = cc.id
    WHERE ccl.created_at >= today_start
      AND cc.tenant_id = p_tenant_id
      AND cc.team_id = ANY(p_team_ids)
      AND cc.case_status != 'deleted'
  ),
  call_counts AS (
    SELECT 
      case_id,
      employee_id,
      COUNT(*) as call_count
    FROM today_calls
    GROUP BY case_id, employee_id
  ),
  telecaller_stats AS (
    SELECT 
      e.id as telecaller_id,
      e.name as telecaller_name,
      e.emp_id,
      t.id as team_id,
      t.name as team_name,
      COUNT(DISTINCT tc.case_id) as live_cases,
      COUNT(CASE WHEN tc.call_status IN ('PTP', 'PAID') THEN 1 END) as completed_today,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', tc.case_id,
          'loanId', tc.loan_id,
          'customerName', tc.customer_name,
          'mobileNo', tc.mobile_no,
          'callStatus', tc.call_status,
          'lastCallTime', to_char(tc.created_at, 'HH24:MI:SS'),
          'callCount', COALESCE(cc.call_count, 0),
          'caseStatus', tc.case_status,
          'dpd', tc.dpd,
          'pos', tc.outstanding_amount,
          'emi', tc.emi_amount,
          'priority', tc.priority
        ) ORDER BY tc.created_at DESC
      ) FILTER (WHERE tc.rn = 1) as cases_details
    FROM today_calls tc
    INNER JOIN employees e ON tc.employee_id = e.id
    INNER JOIN teams t ON tc.team_id = t.id
    LEFT JOIN call_counts cc ON tc.case_id = cc.case_id AND tc.employee_id = cc.employee_id
    WHERE tc.rn = 1
    GROUP BY e.id, e.name, e.emp_id, t.id, t.name
  ),
  total_cases_per_telecaller AS (
    SELECT 
      telecaller_id,
      team_id,
      COUNT(*) as total_cases
    FROM customer_cases
    WHERE tenant_id = p_tenant_id
      AND team_id = ANY(p_team_ids)
      AND case_status != 'deleted'
    GROUP BY telecaller_id, team_id
  ),
  user_activity_latest AS (
    SELECT DISTINCT ON (employee_id)
      employee_id,
      status,
      last_active_time
    FROM user_activity
    WHERE tenant_id = p_tenant_id
      AND last_active_time >= NOW() - INTERVAL '24 hours'
    ORDER BY employee_id, last_active_time DESC
  ),
  team_telecaller_agg AS (
    SELECT 
      ts.team_id,
      ts.team_name,
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', ts.telecaller_id,
          'name', ts.telecaller_name,
          'teamName', ts.team_name,
          'totalCases', COALESCE(tc.total_cases, 0),
          'liveCases', ts.live_cases,
          'completedToday', ts.completed_today,
          'lastActivity', CASE 
            WHEN ua.last_active_time IS NULL THEN 'Offline'
            WHEN EXTRACT(EPOCH FROM (NOW() - ua.last_active_time))/60 < 60 
              THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - ua.last_active_time))/60) || 'm ago'
            WHEN EXTRACT(EPOCH FROM (NOW() - ua.last_active_time))/60 < 1440 
              THEN FLOOR(EXTRACT(EPOCH FROM (NOW() - ua.last_active_time))/3600) || 'h ago'
            ELSE 'Offline'
          END,
          'status', COALESCE(ua.status, 'Offline'),
          'casesDetails', COALESCE(ts.cases_details, '[]'::JSON)
        )
      ) as telecallers,
      SUM(COALESCE(tc.total_cases, 0)) as total_cases,
      SUM(ts.live_cases) as live_cases
    FROM telecaller_stats ts
    LEFT JOIN total_cases_per_telecaller tc 
      ON ts.telecaller_id = tc.telecaller_id AND ts.team_id = tc.team_id
    LEFT JOIN user_activity_latest ua ON ts.telecaller_id = ua.employee_id
    GROUP BY ts.team_id, ts.team_name
  )
  SELECT JSON_AGG(
    JSON_BUILD_OBJECT(
      'teamId', team_id,
      'teamName', team_name,
      'totalCases', total_cases,
      'liveCases', live_cases,
      'telecallers', telecallers
    )
  ) INTO result
  FROM team_telecaller_agg;
  
  RETURN COALESCE(result, '[]'::JSON);
END;
$$;
