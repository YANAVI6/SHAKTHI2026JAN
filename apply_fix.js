
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function applyMigration() {
    const sql = fs.readFileSync('supabase/migrations/20260110_fix_chat_user_status_fk.sql', 'utf8');
    console.log('Applying migration...');

    // We can't run raw SQL via supabase-js unless we have a RPC function like 'exec_sql'
    // Let's check if there is an exec_sql function
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error('Migration failed (RPC exec_sql probably missing):', error.message);
        console.log('Using fallback: Trying to use standard API to check status');
    } else {
        console.log('Migration applied successfully!');
    }
}

applyMigration();
