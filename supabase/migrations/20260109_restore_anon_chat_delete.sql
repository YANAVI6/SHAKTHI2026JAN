-- RESTORE: Allow Anon All for Chat Channels
-- This ensures that 'anon' users (authenticated via custom auth) can delete channels.
-- This effectively overrides the restrictive policy created earlier.

BEGIN;

  -- 1. Drop the restrictive policy we just added
  -- We don't want ANY other policy to deny access (policies are permissive, but let's clean up)
  DROP POLICY IF EXISTS "Allow users to delete channels" ON chat_channels;
  DROP POLICY IF EXISTS "Allow users to delete their own channels" ON chat_channels;

  -- 2. Drop "Allow anon all" just to be sure we are recreating it fresh
  DROP POLICY IF EXISTS "Allow anon all" ON chat_channels;

  -- 3. Create "Allow anon all"
  -- This allows INSERT, SELECT, UPDATE, DELETE for everyone (anon role)
  CREATE POLICY "Allow anon all"
  ON chat_channels
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

  -- 4. Ensure RLS is enabled (it should be)
  ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

COMMIT;
