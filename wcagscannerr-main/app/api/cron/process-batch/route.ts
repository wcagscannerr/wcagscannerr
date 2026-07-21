import { NextRequest, NextResponse } from 'next/server';
import { processQueuedScans } from '@/lib/scanner/batchProcessor';

// Runs once/day (Vercel Hobby's cron ceiling — see vercel.json). This is
// deliberately NOT the primary way batches get processed; on the free
// tier, once/day is far too slow for something a user expects to finish
// in minutes. The real driver is /api/scan/batch/tick, called repeatedly
// by the browser while a /batch/[id] page is open. This cron exists purely
// as a nightly safety net for scans left stuck in 'queued' because someone
// closed the tab before their batch finished.
const SCANS_PER_TICK = 3; // was 10 - reduced since batch scans now run responsive (3-viewport) scanning, which takes roughly 3x longer per URL

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processQueuedScans(SCANS_PER_TICK);
  return NextResponse.json(result);
}