-- Run all chat-related migrations
-- Execute this file to set up the complete chat database schema

\echo 'Starting chat database setup...'

-- 1. Chat Channels
\echo 'Creating chat_channels table...'
\i supabase/tables/20_chat_channels.sql

-- 2. Chat Channel Members
\echo 'Creating chat_channel_members table...'
\i supabase/tables/21_chat_channel_members.sql

-- 3. Chat Messages
\echo 'Creating chat_messages table...'
\i supabase/tables/22_chat_messages.sql

-- 4. Chat User Status
\echo 'Creating chat_user_status table...'
\i supabase/tables/23_chat_user_status.sql

-- 5. Chat Typing Indicators
\echo 'Creating chat_typing_indicators table...'
\i supabase/tables/24_chat_typing_indicators.sql

\echo 'Chat database setup complete!'
\echo 'All tables created with Row Level Security enabled.'
