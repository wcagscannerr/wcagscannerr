import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { data: batch, error: batchError } = await db
    .from('batch_scans')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  const { data: scans } = await db
    .from('scans')
    .select('id, url, status, compliance_score, total_violations, critical_count, serious_count, moderate_count, minor_count, error_message, queue_position')
    .eq('batch_id', params.id)
    .order('queue_position', { ascending: true });

  const scanIds = (scans || []).map(s => s.id);
  let reportIdByScanId: Record<string, string> = {};

  if (scanIds.length > 0) {
    const { data: reports } = await db
      .from('reports')
      .select('id, scan_id')
      .in('scan_id', scanIds);

    for (const r of reports || []) {
      reportIdByScanId[r.scan_id] = r.id;
    }
  }

  const pages = (scans || []).map(s => ({
    scan_id: s.id,
    report_id: reportIdByScanId[s.id] || null,
    url: s.url,
    status: s.status,
    score: s.compliance_score,
    violations: s.total_violations || 0,
    critical: s.critical_count || 0,
    serious: s.serious_count || 0,
    moderate: s.moderate_count || 0,
    minor: s.minor_count || 0,
    error: s.error_message,
  }));

  return NextResponse.json({
    id: batch.id,
    name: batch.name,
    status: batch.status,
    total_urls: batch.total_urls,
    completed_urls: batch.completed_urls,
    failed_urls: batch.failed_urls,
    created_at: batch.created_at,
    completed_at: batch.completed_at,
    pages,
  });
}