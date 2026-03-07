
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkSchema() {
    console.log('Using URL:', supabaseUrl);
    console.log('Checking chat_user_status schema...');

    const { data, error } = await supabase.from('chat_user_status').select('*').limit(1);

    if (error) {
        console.error('Error selecting:', error);
    } else {
        console.log('Sample data/Columns:', data);
    }

    const testUserId = '00000000-0000-0000-0000-000000000000';
    const testTenantId = '8929624e-9aa6-4588-b6a4-a45692af1a94'; // Use a real tenant id if possible from logs

    console.log('Attempting upsert...');
    const { error: upsertError } = await supabase
        .from('chat_user_status')
        .upsert({
            user_id: testUserId,
            tenant_id: testTenantId,
            status: 'online',
            last_seen: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (upsertError) {
        console.error('Upsert Error:', JSON.stringify(upsertError, null, 2));
    } else {
        console.log('Upsert Success!');
    }
}

checkSchema();
