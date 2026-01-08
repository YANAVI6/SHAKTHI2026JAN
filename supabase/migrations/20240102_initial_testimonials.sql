CREATE TABLE IF NOT EXISTS testimonials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  company TEXT NOT NULL,
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  avatar_url TEXT,
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to facilitate re-running the script
DROP POLICY IF EXISTS "Public testimonials are viewable by everyone" ON testimonials;
DROP POLICY IF EXISTS "Anyone can insert testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can do everything" ON testimonials;

-- Policy: Everyone can read approved testimonials
CREATE POLICY "Public testimonials are viewable by everyone" ON testimonials
  FOR SELECT USING (approved = true);

-- Policy: Everyone can create testimonials (submission)
CREATE POLICY "Anyone can insert testimonials" ON testimonials
  FOR INSERT WITH CHECK (true);

-- Policy: Authenticated users (Admins) can do everything
CREATE POLICY "Admins can do everything" ON testimonials
  FOR ALL USING (auth.role() = 'authenticated');
