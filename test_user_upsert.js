
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
    // Test if we can insert without on_conflict with a known user (if it exists)
    // Or just try to see if it allows a simple insert
    const uid = '72739971-13e5-43c7-9550-0cabdc777d36'; // User from logs
    const tid = '8929624e-9aa6-4588-b6a4-a45692af1a94';

    console.log('Testing upsert for real user...');
    const { error } = await supabase.from('chat_user_status').upsert({
        user_id: uid,
        tenant_id: tid,
        status: 'online',
        last_seen: new Date().toISOString()
    }, { onConflict: 'user_id' });

    if (error) {
        console.error('Upsert Error:', error);
    } else {
        console.log('Upsert Success!');
    }
}

check();
