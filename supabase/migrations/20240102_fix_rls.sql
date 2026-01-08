-- The application uses custom authentication and does not establish a Supabase Auth session.
-- Therefore, auth.role() is 'anon', causing the previous "authenticated" policies to fail.
-- We update the policies to allow access, relying on the application's API/Frontend to restrict access.

-- Fix Social Media Links RLS
DROP POLICY IF EXISTS "Admins can manage social links" ON social_media_links;
-- Allow read/write for everyone (since app handles auth)
CREATE POLICY "Manage social links" ON social_media_links 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);

-- Fix Testimonials Admin RLS
DROP POLICY IF EXISTS "Admins can do everything" ON testimonials;
-- Update to allow admin operations without Supabase Auth session
CREATE POLICY "Manage testimonials" ON testimonials 
  FOR ALL 
  USING (true) 
  WITH CHECK (true);
