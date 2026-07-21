import { updateSession } from '@/lib/supabase/middleware';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_PATHS = ['/dashboard', '/agency', '/billing', '/settings', '/monitoring','/reports', '/scanner', '/batch', '/batch-reports', '/vpat', '/help'];
const API_PROTECTED_BASE = '/api/';
const PUBLIC_API_PATHS = [
  '/api/dodo/webhook',
  '/api/scan',
  '/api/scan-activity',
  '/api/v1/scan',
  '/api/v1/keys',
  // /api/cron/* routes (run-monitoring, process-batch) are hit by GitHub
  // Actions via server-to-server curl with an `Authorization: Bearer
  // CRON_SECRET` header — there's no browser session cookie, so without
  // this the middleware redirected every cron call to /login (an HTML
  // page, HTTP 307/308) before the route's own CRON_SECRET check ever
  // ran. That's why the monitoring and batch-processing workflows always
  // failed. Each /api/cron route verifies CRON_SECRET itself; it doesn't
  // need the cookie-session gate.
  '/api/cron',
  // Same story for /api/monitoring/check-alerts, which the monitoring
  // cron calls the same way. The rest of /api/monitoring (used by the
  // dashboard UI) still does its own supabase.auth.getUser() check
  // internally, so whitelisting the whole prefix here is safe — it just
  // means those routes return their own JSON 401 instead of an HTML
  // redirect when unauthenticated, which is the correct behavior for an
  // API route either way.
  '/api/monitoring',
];

// These paths must always load without a session cookie ok
const PUBLIC_PATHS = [
  '/reset-password',
  '/forgot-password',
  '/auth/confirm',
  '/auth',
  '/login',
  '/signup',
  '/',
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── CRITICAL FIX: Completely bypass session/auth for all /api/v1/* routes ──
  // These routes use Bearer token auth (not cookies), so Supabase session
  // handling must be skipped entirely to avoid redirect loops.
  if (pathname.startsWith('/api/v1/')) {
    return NextResponse.next();
  }

  // Skip all auth checks for public paths
  if (PUBLIC_PATHS.some(path => pathname === path)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Check if the path is a protected dashboard route
  const isProtectedRoute = PROTECTED_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  // Check if it's a protected API rooute
  const isApiRoute = pathname.startsWith(API_PROTECTED_BASE);
  const isPublicApiRoute = PUBLIC_API_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );
  const isProtectedApiRoute = isApiRoute && !isPublicApiRoute;

  // Redirect unauthenticated users to login
  if (!user && (isProtectedRoute || isProtectedApiRoute)) {
    const loginUrl = new URL('/login', request.url);
    // Don't append ?redirect for /dashboard — login always lands there
    // anyway, and the param just clutters the URL. Keep it for other
    // protected routes so deep links survive the auth round-trip.
    if (pathname !== '/dashboard') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users away from auth pages
  if (user && (pathname === '/login' || pathname === '/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};