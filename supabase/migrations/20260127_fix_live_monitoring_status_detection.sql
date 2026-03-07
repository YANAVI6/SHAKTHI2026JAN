-- Fix Live Monitoring Status Detection
-- Updates get_live_monitoring_stats to consider recent call activity (last 20 mins) as 'Online'

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
  
  -- 1. Get all active telecallers for the requested teams
  WITH target_telecallers AS (
    SELECT DISTINCT
      t.id as team_id,
      t.name as team_name,
      e.id as telecaller_id,
      e.name as telecaller_name,
      e.emp_id
    FROM teams t
    JOIN team_telecallers tt ON t.id = tt.team_id
    JOIN employees e ON tt.telecaller_id = e.id
    WHERE t.tenant_id = p_tenant_id
      AND t.id = ANY(p_team_ids)
      AND e.status = 'active'
      AND e.role = 'Telecaller'
  ),
  -- 2. Get calls made TODAY by these telecallers
  today_calls AS (
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
      AND ccl.employee_id IN (SELECT telecaller_id FROM target_telecallers)
  ),
  -- 3. Calculate detailed stats per telecaller including LAST CALL TIME for status
  telecaller_stats AS (
    SELECT 
      tt.telecaller_id,
      tt.telecaller_name,
      tt.emp_id,
      tt.team_id,
      tt.team_name,
      COUNT(DISTINCT tc.case_id) as live_cases,
      COUNT(CASE WHEN tc.call_status IN ('PTP', 'PAID') THEN 1 END) as completed_today,
      MAX(tc.created_at) as latest_call_at, -- Track last call time for status
      JSON_AGG(
        JSON_BUILD_OBJECT(
          'id', tc.case_id,
          'loanId', tc.loan_id,
          'customerName', tc.customer_name,
          'mobileNo', tc.mobile_no,
          'callStatus', tc.call_status,
          'lastCallTime', to_char(tc.created_at, 'HH24:MI:SS'),
          'callCount', (
             SELECT COUNT(*) 
             FROM today_calls sub 
             WHERE sub.case_id = tc.case_id AND sub.employee_id = tc.employee_id
          ),
          'caseStatus', tc.case_status,
          'dpd', tc.dpd,
          'pos', tc.outstanding_amount,
          'emi', tc.emi_amount,
          'priority', tc.priority
        ) ORDER BY tc.created_at DESC
      ) FILTER (WHERE tc.rn = 1) as cases_details
    FROM target_telecallers tt
    LEFT JOIN today_calls tc ON tt.telecaller_id = tc.employee_id AND tc.rn = 1
    GROUP BY tt.telecaller_id, tt.telecaller_name, tt.emp_id, tt.team_id, tt.team_name
  ),
  -- 4. Get total assigned cases per telecaller (Snapshot)
  total_cases_per_telecaller AS (
    SELECT 
      telecaller_id,
      team_id,
      COUNT(*) as total_cases
    FROM customer_cases
    WHERE tenant_id = p_tenant_id
      AND team_id = ANY(p_team_ids)
      AND case_status != 'deleted'
      AND telecaller_id IS NOT NULL
    GROUP BY telecaller_id, team_id
  ),
  -- 5. Get user online status from user_activity
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
  -- 6. Aggregate by Team with IMPROVED STATUS LOGIC
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
          -- Status Logic:
          -- 1. If last call was within 20 mins -> Online (Implicit)
          -- 2. If explicit status is Online -> Online
          -- 3. Else -> Fallback to explicit status or Offline
          'status', CASE 
            WHEN ts.latest_call_at IS NOT NULL AND EXTRACT(EPOCH FROM (NOW() - ts.latest_call_at))/60 < 20 THEN 'Online'
            WHEN ua.status = 'Online' THEN 'Online'
            ELSE COALESCE(ua.status, 'Offline')
          END,
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
