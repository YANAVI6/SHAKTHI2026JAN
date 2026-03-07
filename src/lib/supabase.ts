import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials. Please check your environment variables.');
}

if (import.meta.env.DEV) {
  if (supabaseUrl === 'demo' || supabaseUrl === 'localhost' || supabaseUrl.includes('127.0.0.1')) {
    console.warn('⚠️ Using local/development Supabase instance');
    console.warn('For production, please set VITE_SUPABASE_URL to your Supabase project URL');
  }

  console.log('🗄️ Initializing real Supabase client');
  console.log('📍 URL:', supabaseUrl);
}

let clientUrl = supabaseUrl;

// If pointing to local Supabase, use the Vite proxy (localhost:3000) instead of direct IP (127.0.0.1)
// This avoids CORS issues by routing requests through the Vite dev server
if (supabaseUrl.includes('127.0.0.1') || supabaseUrl.includes('localhost:54321')) {
  console.log('🔄 Routing Supabase requests through Vite proxy to resolve CORS');
  // check if window is defined (browser env)
  if (typeof window !== 'undefined') {
    clientUrl = window.location.origin;
  }
}

const supabase = createClient(clientUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export { supabase };

export interface SuperAdmin {
  id: string;
  username: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}
