-- Allow users to delete channels they created
-- This covers the missing DELETE policy for authenticated users

BEGIN;

  -- 1. Drop existing policy if it exists (to avoid conflict or duplication)
  DROP POLICY IF EXISTS "Allow users to delete their own channels" ON chat_channels;

  -- 2. Create the DELETE policy
  -- Only allow deletion if the user is the 'created_by' user
  CREATE POLICY "Allow users to delete their own channels"
  ON chat_channels
  FOR DELETE
  TO authenticated
  USING (
    created_by = auth.uid()
  );

  -- 3. Also allow Company Admins to delete any channel in their tenant?
  -- Let's make it robust: Allow if created_by match OR if user is a company admin in the same tenant
  -- BUT getting specific role check inside RLS can be complex if not joined carefully.
  -- Simpler approach: If you are the creator, you can delete.

COMMIT;
