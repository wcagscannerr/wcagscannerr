// ============================================================
// Step 10 — User-controlled violation status endpoint
// ============================================================
//
// POST /api/violations/status
//   Body: { scan_id, rule_id, page_url, element_html, status, notes? }
//   Computes stable_key server-side from the four tuple fields so
//   the UI never has to know about md5. Upserts into violation_status.
//
// GET /api/violations/status?stable_keys=k1,k2,...
//   Returns the current status rows for those keys (only the calling
//   user's). Used by ViolationCard.tsx to hydrate badges in bulk
//   when rendering a report.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import {
  computeStableKey,
  type ViolationStatus,
} from '@/lib/scanner/statusTracker';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  scan_id: z.string().uuid(),
  rule_id: z.string().min(1),
  page_url: z.string().url(),
  element_html: z.string().min(1).max(50_000),
  status: z.enum(['open', 'fixed', 'false_positive', 'in_progress']),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  // Confirm the scan belongs to the caller (RLS would also enforce,
  // but doing it explicitly gives a clearer 404 message).
  const { data: scan } = await supabase
    .from('scans')
    .select('id, user_id')
    .eq('id', parsed.data.scan_id)
    .single();
  if (!scan || scan.user_id !== user.id) {
    return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  }

  const stable_key = computeStableKey({
    rule_id: parsed.data.rule_id,
    page_url: parsed.data.page_url,
    element_html: parsed.data.element_html,
  });

  // Upsert on (user_id, stable_key) — the unique index from migration 018
  // provides the conflict target.
  const { data: row, error } = await supabase
    .from('violation_status')
    .upsert(
      {
        user_id: user.id,
        stable_key,
        status: parsed.data.status,
        notes: parsed.data.notes ?? null,
        last_seen_scan_id: parsed.data.scan_id,
        first_marked_scan_id: parsed.data.scan_id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,stable_key' },
    )
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, row });
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const url = new URL(request.url);
  const keysParam = (url.searchParams.get('stable_keys') ?? '').trim();
  if (!keysParam) {
    return NextResponse.json({ rows: [] });
  }
  const keys = keysParam.split(',').filter(Boolean).slice(0, 500);
  if (keys.length === 0) {
    return NextResponse.json({ rows: [] });
  }

  const { data, error } = await supabase
    .from('violation_status')
    .select('*')
    .eq('user_id', user.id)
    .in('stable_key', keys);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ rows: data ?? [] });
}
