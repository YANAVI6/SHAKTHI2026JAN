import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your environment variables.');
}

if (supabaseUrl === 'demo' || supabaseUrl === 'localhost' || supabaseUrl.includes('127.0.0.1')) {
  console.warn('⚠️ Using local/development Supabase instance');
  console.warn('For production, please set VITE_SUPABASE_URL to your Supabase project URL');
}

console.log('🗄️ Initializing real Supabase client');
console.log('📍 URL:', supabaseUrl);
console.log('🔑 Anon Key:', supabaseAnonKey.substring(0, 20) + '...');

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export { supabase };

export interface SuperAdmin {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}
