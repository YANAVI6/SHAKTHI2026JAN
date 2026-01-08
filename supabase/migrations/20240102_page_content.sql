CREATE TABLE IF NOT EXISTS page_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT, -- Storing HTML/Markdown content
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Manage page content" ON page_content;

-- Create open policy to allow app to manage content
CREATE POLICY "Manage page content" ON page_content
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert enriched default content
INSERT INTO page_content (slug, title, content)
VALUES
  (
    'contact', 
    'Contact Us', 
    '<h2>Get in Touch</h2><p>We are here to help you scale your recovery operations. Reach out to our dedicated support team or sales department.</p><h3>Headquarters</h3><p>Shakthi Towers, FinTech District<br>Cyber City, Gurugram, India 122002</p><h3>Support Channels</h3><p><strong>Email:</strong> support@shakthicrm.com<br><strong>Phone:</strong> +91 80 4000 5000<br><strong>Hours:</strong> Mon-Fri, 9:00 AM - 7:00 PM IST</p>'
  ),
  (
    'about', 
    'About Shakthi', 
    '<h2>Revolutionizing Debt Recovery</h2><p>Shakthi is an enterprise-grade CRM platform designed specifically for high-volume debt collection agencies. Our mission is to bridge the gap between aggressive recovery targets and compliant, ethical communication.</p><h3>Our Vision</h3><p>To empower agencies with data-driven insights, real-time monitoring, and automated workflows that maximize recovery rates while maintaining the highest meaningful standards of operation.</p><h3>Why Shakthi?</h3><ul><li><strong>Real-time Analytics:</strong> Monitor floor performance as it happens.</li><li><strong>Compliance First:</strong> Built-in guardrails for regulatory adherence.</li><li><strong>Scalable Architecture:</strong> Handle millions of accounts without latency.</li></ul>'
  ),
  (
    'security-vault', 
    'Security Vault', 
    '<h2>Enterprise-Grade Security</h2><p>Your data is our most valuable asset. Shakthi Security Vault ensures end-to-end protection for all sensitive financial information.</p><h3>Encryption Standards</h3><p>All data is encrypted at rest using AES-256 and in transit via TLS 1.3. We maintain strict key management protocols.</p><h3>Compliance & Certifications</h3><ul><li><strong>SOC 2 Type II:</strong> Independently audited for security and availability.</li><li><strong>ISO 27001:</strong> Certified information security management system.</li><li><strong>RBI Compliance:</strong> Adherence to local lending and data localization norms.</li></ul><h3>Access Control</h3><p>Granular RBAC (Role-Based Access Control) ensures employees only see what they need to see.</p>'
  ),
  (
    'api-docs', 
    'API Documentation', 
    '<h2>Shakthi API Reference</h2><p>Integrate Shakthi directly into your existing fintech ecosystem. Our RESTful API provides programmatic access to leads, dispositions, and reporting.</p><h3>Authentication</h3><p>Authenticate using your API Key passed in the header: <code>Authorization: Bearer YOUR_API_KEY</code></p><h3>Core Endpoints</h3><ul><li><code>GET /v1/cases</code> - Retrieve customer cases</li><li><code>POST /v1/disposition</code> - Log a call outcome</li><li><code>GET /v1/agents/performance</code> - Fetch real-time agent metrics</li></ul><h3>Rate Limits</h3><p>Standard tier: 1000 requests/minute. Contact enterprise sales for higher limits.</p>'
  ),
  (
    'privacy-policy', 
    'Privacy Policy', 
    '<h2>Privacy Policy</h2><p>Last updated: January 2025</p><p>At Shakthi, we take data security seriously. This policy describes how we collect, use, and handle your personal and operational data.</p><h3>1. Data Collection</h3><p>We collect information necessary to provide our CRM services, including user credentials, call logs, and recovery metrics. All data is encrypted at rest and in transit.</p><h3>2. Data Usage</h3><p>Your data is used solely for the purpose of enabling your recovery operations, generating performance reports, and ensuring system stability. We do not sell your data to third parties.</p><h3>3. Compliance</h3><p>We adhere to all relevant local and international data protection regulations.</p>'
  ),
  (
    'terms-conditions', 
    'Terms & Conditions', 
    '<h2>Terms of Service</h2><p>Last updated: January 2025</p><p>Please read these terms carefully before using the Shakthi platform.</p><h3>1. Acceptance of Terms</h3><p>By accessing or using Shakthi, you agree to be bound by these Terms. If you disagree with any part of the terms, you may not access the service.</p><h3>2. License</h3><p>Shakthi grants you a limited, non-exclusive, non-transferable license to use our software for your internal business operations.</p><h3>3. User Responsibilities</h3><p>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>'
  )
ON CONFLICT (slug) 
DO UPDATE SET 
  title = EXCLUDED.title, 
  content = EXCLUDED.content,
  last_updated = NOW();
