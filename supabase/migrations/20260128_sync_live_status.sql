-- Migration: Sync Live Monitoring (chat_user_status) with Activity Tracker (user_activity)
-- Fixes issue where users appear Online in Live Monitoring but are actually Offline

-- 1. Set everyone to OFFLINE who does not have an active session
-- This covers users like Sushmitha K who are not logged in today
UPDATE chat_user_status
SET status = 'offline', last_seen = NOW()
WHERE user_id NOT IN (
    SELECT employee_id 
    FROM user_activity 
    WHERE logout_time IS NULL
);

-- 2. Sync status for currently active users
-- Ensures that if Activity Tracker says "Idle" or "Break", Live Monitoring says the same
UPDATE chat_user_status c
SET 
  status = CASE 
    WHEN lower(ua.status) = 'online' THEN 'online'
    WHEN lower(ua.status) = 'break' THEN 'break'
    WHEN lower(ua.status) = 'idle' THEN 'idle'
    ELSE 'offline'
  END,
  last_seen = ua.last_active_time
FROM user_activity ua
WHERE c.user_id = ua.employee_id
  AND ua.logout_time IS NULL;

-- 3. Verify fix
-- (Optional cleanup for any weird states)
UPDATE chat_user_status
SET status = 'offline'
WHERE status IS NULL;
