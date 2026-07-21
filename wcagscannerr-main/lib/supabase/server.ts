import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

/** Browser-facing server client — respects RLS via the anon key + user session cookies */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );
}

/**
 * Service-role client — bypasses RLS entirely.
 *
 * Use ONLY in server-side API routes / background tasks where you
 * have already verified the user's identity via auth.getUser() in the
 * route handler.  Never expose this client to the browser.
 *
 * IMPORTANT: `global.fetch` here explicitly passes `cache: 'no-store'`
 * on every request the client makes. Supabase's JS client talks to
 * Postgres over PostgREST using plain `fetch()` under the hood, and
 * Next.js's App Router patches the global `fetch` to participate in its
 * Data Cache. `export const dynamic = 'force-dynamic'` on a route is
 * supposed to opt all of that route's fetches out of caching too, but
 * in practice this doesn't always reliably reach fetch calls made
 * inside third-party library code (rather than directly in the route
 * file) — which is exactly what caused cron reads to intermittently
 * return stale/cached rows (a site that had just been updated still
 * showing its old value, a newly-inserted site missing from results
 * entirely) despite the route itself re-running on every request.
 * Setting `cache: 'no-store'` at the client level closes that gap for
 * every query made through this client, everywhere, regardless of
 * which route calls it.
 */
export function createServiceClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        fetch: (url, options = {}) => fetch(url, { ...options, cache: 'no-store' }),
      },
    }
  );
}
