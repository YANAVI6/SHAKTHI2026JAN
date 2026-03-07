-- Migration: Fix Login Time to use Server Time via RPC
-- Reason: Prevent incorrect login times due to client-side clock issues (e.g. 12h difference)

CREATE OR REPLACE FUNCTION resume_user_session(
  p_tenant_id UUID,
  p_employee_id UUID,
  p_status VARCHAR DEFAULT 'Online'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Atomic Upsert to prevent race conditions
  INSERT INTO user_activity (
    tenant_id,
    employee_id,
    login_time,
    last_active_time,
    status,
    total_break_time,
    total_idle_time,
    break_count
  ) VALUES (
    p_tenant_id,
    p_employee_id,
    NOW(), -- New session login time
    NOW(), -- New session last active
    p_status,
    0, -- Initial break time
    0, -- Initial idle time
    0  -- Initial break count
  )
  ON CONFLICT (tenant_id, employee_id)
  DO UPDATE SET
    -- Always update these for active session
    last_active_time = NOW(),
    status = EXCLUDED.status,
    logout_time = NULL,
    logout_reason = NULL,
    updated_at = NOW(),
    
    -- Conditional updates depending on if it's a new day
    login_time = CASE 
      WHEN user_activity.login_time >= DATE_TRUNC('day', NOW()) THEN user_activity.login_time 
      ELSE EXCLUDED.login_time 
    END,
    total_break_time = CASE 
      WHEN user_activity.login_time >= DATE_TRUNC('day', NOW()) THEN user_activity.total_break_time 
      ELSE 0 
    END,
    total_idle_time = CASE 
      WHEN user_activity.login_time >= DATE_TRUNC('day', NOW()) THEN user_activity.total_idle_time 
      ELSE 0 
    END,
    break_count = CASE 
      WHEN user_activity.login_time >= DATE_TRUNC('day', NOW()) THEN user_activity.break_count 
      ELSE 0 
    END,
    current_break_start = CASE 
      WHEN user_activity.login_time >= DATE_TRUNC('day', NOW()) THEN user_activity.current_break_start 
      ELSE NULL 
    END;
END;
$$;
