-- Diagnostic: Check Realtime Setup
-- 1. List tables in supabase_realtime publication
-- 2. Check Replica Identity of chat tables

SELECT 
    P.pubname AS publication_name, 
    T.schemaname AS schema_name, 
    T.tablename AS table_name
FROM pg_publication P
JOIN pg_publication_tables T ON P.pubname = T.pubname
WHERE P.pubname = 'supabase_realtime'
AND T.tablename LIKE 'chat_%';

-- Check Replica Identity
SELECT 
    relname AS table_name, 
    CASE 
        WHEN relreplident = 'd' THEN 'default' 
        WHEN relreplident = 'n' THEN 'nothing' 
        WHEN relreplident = 'f' THEN 'full' 
        WHEN relreplident = 'i' THEN 'index' 
    END AS replica_identity
FROM pg_class 
WHERE relname IN ('chat_channels', 'chat_messages', 'chat_channel_members');
