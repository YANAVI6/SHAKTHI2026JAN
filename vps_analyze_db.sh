#!/bin/bash
# Script to analyze and fix database constraints safely

# 1. Analyze constraints
echo "--- Analysing current constraints ---"
docker exec supabase-db psql -U supabase_admin -d postgres -c "
SELECT 
    conname, 
    rel.relname as table_name, 
    frel.relname as referenced_table,
    pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_class rel ON rel.oid = c.conrelid
LEFT JOIN pg_class frel ON frel.oid = c.confrelid
WHERE rel.relname IN ('user_activity', 'chat_channels', 'chat_messages', 'chat_channel_members', 'chat_user_status', 'chat_typing_indicators');
"

# 2. Check for missing important FKs we might have dropped
echo "--- Checking for missing internal chat FKs ---"
docker exec supabase-db psql -U supabase_admin -d postgres -c "
SELECT 'Missing chat_channel_members -> chat_channels' as status
WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'chat_channel_members'::regclass 
    AND confrelid = 'chat_channels'::regclass
);
"
