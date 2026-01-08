CREATE TABLE IF NOT EXISTS social_media_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL, -- 'facebook', 'twitter', 'linkedin', 'instagram', 'youtube'
  url TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE social_media_links ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public can view active social links" ON social_media_links;
DROP POLICY IF EXISTS "Admins can manage social links" ON social_media_links;

-- Policy: Public read (active only)
CREATE POLICY "Public can view active social links" ON social_media_links
  FOR SELECT USING (is_active = true);

-- Policy: Admin full access
CREATE POLICY "Admins can manage social links" ON social_media_links
  FOR ALL USING (auth.role() = 'authenticated');
