
import { supabase } from './src/lib/supabase.ts';

async function checkSchema() {
    console.log('Checking chat_user_status schema...');

    // Try to insert a dummy record and see what happens or if it reveals schema
    // We can't easily get 'describe' from supabase-js without an RPC
    // But we can try to use standard postgres info if we had access to raw SQL.
    // Since we don't, let's try a simple select to see columns
    const { data, error } = await supabase.from('chat_user_status').select('*').limit(1);

    if (error) {
        console.error('Error selecting:', error);
    } else {
        console.log('Sample data/Columns:', data);
    }

    // Let's try the upsert that's failing
    const testUserId = '00000000-0000-0000-0000-000000000000'; // Dummy UUID
    const testTenantId = '00000000-0000-0000-0000-000000000000';

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
        console.error('Upsert Error:', upsertError);
    } else {
        console.log('Upsert Success!');
    }
}

checkSchema();
