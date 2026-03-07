#!/bin/bash
docker exec supabase-db psql -U supabase_admin -d postgres -c "
DO \$\$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'chat_user_status'::regclass AND contype = 'f') LOOP
        EXECUTE 'ALTER TABLE chat_user_status DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'chat_typing_indicators'::regclass AND contype = 'f') LOOP
        EXECUTE 'ALTER TABLE chat_typing_indicators DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'chat_channel_members'::regclass AND contype = 'f') LOOP
        EXECUTE 'ALTER TABLE chat_channel_members DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
    FOR r IN (SELECT conname FROM pg_constraint WHERE conrelid = 'chat_messages'::regclass AND contype = 'f') LOOP
        EXECUTE 'ALTER TABLE chat_messages DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END \$\$;
"
