-- FINAL ROBUST FIX: Allow ALL users (Anon + Authenticated) to manage channels
-- This replaces all previous policies to ensure no role mismatch blocks deletion.

BEGIN;

  -- 1. Drop ALL existing policies for chat_channels to start clean
  DROP POLICY IF EXISTS "Allow users to delete channels" ON chat_channels;
  DROP POLICY IF EXISTS "Allow users to delete their own channels" ON chat_channels;
  DROP POLICY IF EXISTS "Allow anon all" ON chat_channels;
  DROP POLICY IF EXISTS "Allow public all" ON chat_channels;
  DROP POLICY IF EXISTS "Enable read access for all users" ON chat_channels;
  DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON chat_channels;
  
  -- 2. Create a single, universal policy for PUBLIC (covers Anon & Authenticated)
  -- This allows SELECT, INSERT, UPDATE, DELETE for everyone.
  CREATE POLICY "Allow public all"
  ON chat_channels
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

  -- 3. Ensure RLS is enabled
  ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;

COMMIT;
