#!/bin/bash
# Run psql commands individually to avoid rollback on failure

run_sql() {
    echo "Running: $1"
    docker exec -i supabase-db psql -U supabase_admin -d postgres -c "$1"
}

run_sql "ALTER TABLE user_activity DROP CONSTRAINT IF EXISTS user_activity_employee_id_fkey;"
run_sql "ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_created_by_fkey;"
run_sql "ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;"
run_sql "ALTER TABLE chat_channel_members DROP CONSTRAINT IF EXISTS chat_channel_members_user_id_fkey;"
run_sql "ALTER TABLE chat_user_status DROP CONSTRAINT IF EXISTS chat_user_status_user_id_fkey;"
run_sql "ALTER TABLE chat_typing_indicators DROP CONSTRAINT IF EXISTS chat_typing_indicators_user_id_fkey;"

run_sql "DELETE FROM chat_channel_members WHERE channel_id NOT IN (SELECT id FROM chat_channels);"
run_sql "DELETE FROM chat_messages WHERE channel_id NOT IN (SELECT id FROM chat_channels);"

run_sql "ALTER TABLE chat_channel_members ADD CONSTRAINT chat_channel_members_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;"
run_sql "ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_channel_id_fkey FOREIGN KEY (channel_id) REFERENCES chat_channels(id) ON DELETE CASCADE;"

run_sql "ALTER TABLE chat_user_status DROP CONSTRAINT IF EXISTS chat_user_status_status_check;"
run_sql "ALTER TABLE chat_user_status ADD CONSTRAINT chat_user_status_status_check CHECK (status IN ('online', 'away', 'offline', 'break', 'idle', 'busy'));"

run_sql "NOTIFY pgrst, 'reload schema';"
