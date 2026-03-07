-- Final Cleanup for Stale Sessions
-- Fixes "Ghost" Online users in Chat and Activity Tracker

-- 1. ACTIVITY TRACKER: Close sessions from yesterday
-- If someone logged in yesterday and "left" without logging out, close their session.
UPDATE user_activity
SET 
  logout_time = NOW(),
  status = 'Offline',
  logout_reason = 'System Auto-Logout (Stale Session)'
WHERE logout_time IS NULL
  AND last_active_time < DATE_TRUNC('day', NOW());

-- 2. CHAT STATUS: Force Offline if inactive for > 1 hour
-- The user expects a "5 minute" timeout, but we'll use 1 hour to be safe against active readers.
-- This DEFINITELY catches people absent today (like Sushmitha).
UPDATE chat_user_status
SET status = 'offline'
WHERE status != 'offline'
  AND (
    last_seen IS NULL 
    OR last_seen < (NOW() - INTERVAL '1 hour')
  );

-- 3. FINAL SYNC: Ensure Chat Status matches Activity Table
-- If user is logged out in user_activity, they MUST be offline in chat
UPDATE chat_user_status c
SET status = 'offline'
FROM user_activity ua
WHERE c.user_id = ua.employee_id
  AND ua.logout_time IS NOT NULL
  AND ua.last_active_time < (NOW() - INTERVAL '5 minutes')
  AND c.status != 'offline';
