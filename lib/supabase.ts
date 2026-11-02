import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// In server-side Node.js environment, use SUPABASE_SERVICE_ROLE_KEY if provided to bypass RLS
const effectiveKey = (typeof window === 'undefined' && supabaseServiceKey)
  ? supabaseServiceKey
  : supabaseAnonKey;

export const supabase = createClient(supabaseUrl, effectiveKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
