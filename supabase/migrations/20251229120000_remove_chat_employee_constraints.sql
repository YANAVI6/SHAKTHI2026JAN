-- Remove strict foreign key constraints to employees table to allow CompanyAdmins and SuperAdmins to use chat
-- This allows user_ids from 'company_admins' or 'super_admins' tables to be stored in chat tables

ALTER TABLE chat_channel_members DROP CONSTRAINT IF EXISTS chat_channel_members_user_id_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;
ALTER TABLE chat_user_status DROP CONSTRAINT IF EXISTS chat_user_status_user_id_fkey;
ALTER TABLE chat_typing_indicators DROP CONSTRAINT IF EXISTS chat_typing_indicators_user_id_fkey;

-- Note: We lose referential integrity for 'user_id' pointing to 'employees', 
-- but this is necessary because our users are split across multiple tables (employees, company_admins, super_admins).
