import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processQueuedScans } from '@/lib/scanner/batchProcessor';

// Called by the browser (see app/(dashboard)/batch/[id]/page.tsx's polling
// loop) while a user is actively watching a batch's progress. This is what
// actually drives batch scanning forward in near-real-time — the daily cron
// (/api/cron/process-batch) is just a nightly backstop for abandoned tabs.
//
// Any signed-in user can call this — it processes the global queue, not
// just their own batch, which is fine since it's doing genuinely useful
// work either way and the underlying scan route itself remains plan-gated.
const SCANS_PER_TICK = 2; // was 3 - reduced since batch scans now run responsive (3-viewport) scanning, which takes roughly 3x longer per URL

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Sign in required' }, { status: 401 });
  }

  const result = await processQueuedScans(SCANS_PER_TICK);
  return NextResponse.json(result);
}