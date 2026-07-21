import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const callbackSchema = z.object({
  batchId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  // Verify this is called by GitHub Actions (server-to-server)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = callbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { batchId } = parsed.data;
  const db = createServiceClient();

  // Get the batch record
  const { data: batch, error: batchError } = await db
    .from('batch_scans')
    .select('id, user_id, status, total_urls, completed_urls, failed_urls')
    .eq('id', batchId)
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  // Idempotency: if batch is already in a terminal state, don't update
  if (batch.status === 'completed' || batch.status === 'failed') {
    return NextResponse.json({
      success: true,
      batchId,
      status: batch.status,
      completed: batch.completed_urls,
      failed: batch.failed_urls,
      already_completed: true,
    });
  }

  // Get all scans in this batch to compute final stats
  const { data: scans, error: scansError } = await db
    .from('scans')
    .select('id, status, compliance_score, total_violations, critical_count, serious_count, moderate_count, minor_count')
    .eq('batch_id', batchId);

  if (scansError) {
    console.error('[MULTISCAN CALLBACK] Failed to fetch scans:', scansError);
    return NextResponse.json({ error: 'Failed to fetch scans' }, { status: 500 });
  }

  // Compute final counts
  const completedScans = scans?.filter(s => s.status === 'completed') || [];
  const failedScans = scans?.filter(s => s.status === 'failed') || [];
  
  const finalCompleted = completedScans.length;
  const finalFailed = failedScans.length;
  const allDone = finalCompleted + finalFailed >= batch.total_urls;

  // Determine final status
  let finalStatus: string;
  if (allDone) {
    finalStatus = finalFailed === batch.total_urls ? 'failed' : 
                  finalFailed > 0 ? 'partial' : 'completed';
  } else {
    finalStatus = 'running';
  }

  // Update batch with final counts
  const { error: updateError } = await db
    .from('batch_scans')
    .update({
      completed_urls: finalCompleted,
      failed_urls: finalFailed,
      status: finalStatus,
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq('id', batchId);

  if (updateError) {
    console.error('[MULTISCAN CALLBACK] Failed to update batch:', updateError);
    return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 });
  }

  // Send email notification to user
  try {
    const { data: profile } = await db
      .from('profiles')
      .select('email')
      .eq('id', batch.user_id)
      .single();

    if (profile?.email) {
      const { Resend } = await import('resend');
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://wcagscannerr.com';
      
      await resend.emails.send({
        from: 'WCAG Scanner <reports@wcagscannerr.com>',
        to: profile.email,
        subject: `Multi-scan Complete: ${finalCompleted}/${batch.total_urls} pages scanned`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px;">
            <h1 style="color: #6C47FF; margin-bottom: 4px;">Multi-Page Scan Complete</h1>
            <p style="color: #8B8BA7;">${batch.total_urls} pages scanned</p>
            <div style="background: #111118; border: 1px solid #2A2A3A; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <div style="display: flex; justify-content: space-around; text-align: center;">
                <div>
                  <div style="font-size: 32px; font-weight: 800; color: #22D3A0;">${finalCompleted}</div>
                  <div style="color: #8B8BA7; font-size: 12px;">Completed</div>
                </div>
                <div>
                  <div style="font-size: 32px; font-weight: 800; color: ${finalFailed > 0 ? '#EF4444' : '#8B8BA7'};">${finalFailed}</div>
                  <div style="color: #8B8BA7; font-size: 12px;">Failed</div>
                </div>
              </div>
            </div>
            <a href="${appUrl}/batch/${batchId}"
              style="display: inline-block; background: #6C47FF; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
              View Results →
            </a>
          </div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('[MULTISCAN CALLBACK] Failed to send email:', emailErr);
    // Non-critical, continue
  }

  return NextResponse.json({
    success: true,
    batchId,
    status: finalStatus,
    completed: finalCompleted,
    failed: finalFailed,
  });
}
