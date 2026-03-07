-- Cleanup Stale Sessions
-- Resets login_time to NOW() for active sessions that started before today (local timezone check approximate)

UPDATE user_activity
SET 
  login_time = NOW(),
  total_break_time = 0,
  total_idle_time = 0,
  current_break_start = NULL
WHERE 
  status IN ('Online', 'Idle', 'Break')
  AND login_time < CURRENT_DATE
  AND logout_time IS NULL;
