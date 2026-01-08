-- SECURITY FIX: Enable Row Level Security (RLS) on all tables
-- The linter reports that policies exist but RLS is not enabled.
-- You must run this to actually ENFORCE the security policies we created.

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_user_status ENABLE ROW LEVEL SECURITY;

-- Verification: After running this, the lint errors "Policy Exists RLS Disabled" should disappear.
