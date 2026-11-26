import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { loadServerEnv } from './env.js';

let adminClient: SupabaseClient | undefined;

export function getSupabaseAdmin(): SupabaseClient {
  if (adminClient) return adminClient;

  const env = loadServerEnv();
  adminClient = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
  return adminClient;
}
