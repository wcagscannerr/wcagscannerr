'use client';

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (supabaseClient) return supabaseClient;

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return supabaseClient;
}

let supabaseClientSingleton: ReturnType<typeof createBrowserClient>;

export function getSupabaseBrowserClient() {
  if (supabaseClientSingleton) return supabaseClientSingleton;
  supabaseClientSingleton = createClient();
  return supabaseClientSingleton;
}