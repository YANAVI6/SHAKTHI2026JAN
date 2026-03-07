-- Migration: Fix Heartbeat/Last Active to use Server Time
-- And cleanup existing future timestamps

-- 1. Create RPC for Heartbeat
CREATE OR REPLACE FUNCTION update_user_heartbeat(
  p_employee_id UUID,
  p_tenant_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session RECORD;
  v_now TIMESTAMP WITH TIME ZONE;
  v_break_duration_mins INTEGER;
  v_idle_duration_mins INTEGER;
BEGIN
  v_now := NOW();

  -- Find active session (not logged out)
  SELECT * INTO v_session
  FROM user_activity
  WHERE employee_id = p_employee_id
    AND tenant_id = p_tenant_id
    AND logout_time IS NULL
  ORDER BY login_time DESC
  LIMIT 1;

  IF v_session IS NULL THEN
    -- No active session, do nothing (or could auto-resume, but let's stick to update)
    RETURN;
  END IF;

  -- 1. Check for Day Reset (if login_time was yesterday)
  IF DATE(v_session.login_time AT TIME ZONE 'UTC') < DATE(v_now AT TIME ZONE 'UTC') THEN
     -- It's a new day. Reset stats.
     UPDATE user_activity
     SET 
       login_time = v_now,
       last_active_time = v_now,
       status = 'Online',
       total_break_time = 0,
       total_idle_time = 0,
       break_count = 0,
       current_break_start = NULL,
       updated_at = v_now
     WHERE id = v_session.id;
     RETURN;
  END IF;

  -- 2. Handle Break Logic
  IF v_session.status = 'Break' AND v_session.current_break_start IS NOT NULL THEN
     v_break_duration_mins := EXTRACT(EPOCH FROM (v_now - v_session.current_break_start)) / 60;
     
     -- Auto-logout if break > 60 mins
     IF v_break_duration_mins > 60 THEN
        UPDATE user_activity
        SET 
          logout_time = v_now,
          status = 'Offline',
          logout_reason = 'Break Limit Exceeded (>1hr)',
          updated_at = v_now
        WHERE id = v_session.id;
        RETURN;
     END IF;

     -- Auto-resume from break (user returned)
     -- Add break duration to total
     UPDATE user_activity
     SET 
       status = 'Online',
       last_active_time = v_now,
       current_break_start = NULL,
       total_break_time = COALESCE(total_break_time, 0) + GREATEST(0, v_break_duration_mins),
       updated_at = v_now
     WHERE id = v_session.id;
     RETURN;
  END IF;

  -- 3. Handle Idle Logic
  IF v_session.status = 'Idle' THEN
     v_idle_duration_mins := EXTRACT(EPOCH FROM (v_now - v_session.last_active_time)) / 60;
     
     UPDATE user_activity
     SET 
       status = 'Online',
       last_active_time = v_now,
       total_idle_time = COALESCE(total_idle_time, 0) + GREATEST(0, v_idle_duration_mins),
       updated_at = v_now
     WHERE id = v_session.id;
     RETURN;
  END IF;

  -- 4. Normal Heartbeat (Online)
  UPDATE user_activity
  SET 
    last_active_time = v_now,
    status = 'Online',
    updated_at = v_now
  WHERE id = v_session.id;

END;
$$;

-- 2. CLEANUP: Fix any existing future timestamps
-- This fixes the user "Laxmi" immediately
UPDATE user_activity
SET login_time = NOW()
WHERE login_time > NOW();

UPDATE user_activity
SET last_active_time = NOW()
WHERE last_active_time > NOW();
