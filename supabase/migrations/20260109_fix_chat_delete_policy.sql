-- FIX: Expand Delete Policy for Chat Channels
-- Allow 'CompanyAdmin' to delete any channel in their tenant
-- Keep 'created_by' check for regular users

BEGIN;

  -- 1. Drop the previous restrictive policy
  DROP POLICY IF EXISTS "Allow users to delete their own channels" ON chat_channels;
  DROP POLICY IF EXISTS "Allow users to delete channels" ON chat_channels;

  -- 2. Create the robust DELETE policy
  CREATE POLICY "Allow users to delete channels"
  ON chat_channels
  FOR DELETE
  TO authenticated
  USING (
    -- 1. User is the creator
    created_by = auth.uid()
    OR
    -- 2. User is a Company Admin in the same tenant
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
      AND role = 'CompanyAdmin'
      AND tenant_id = chat_channels.tenant_id
    )
  );

COMMIT;
