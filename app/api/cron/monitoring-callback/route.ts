import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { siteId, userId, batchId, url, pagesCompleted, pagesFailed, totalUrls } = body

  if (!siteId || !batchId || !url) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  try {
    const db = createServiceClient()

    // Get user email
    const { data: profile } = await db
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile?.email) {
      return NextResponse.json({ message: 'No email to send to' })
    }

    // Get batch aggregate for email
    const { data: batch } = await db
      .from('batch_scans')
      .select('completed_urls, failed_urls, total_urls')
      .eq('id', batchId)
      .single()

    // Get aggregate scan stats
    const { data: scans } = await db
      .from('scans')
      .select('compliance_score, total_violations, critical_count')
      .eq('batch_id', batchId)
      .eq('status', 'completed')

    const avgScore = scans && scans.length > 0
      ? Math.round(scans.reduce((s, sc) => s + (sc.compliance_score || 0), 0) / scans.length)
      : 0
    const totalViolations = scans
      ? scans.reduce((s, sc) => s + (sc.total_violations || 0), 0)
      : 0
    const totalCritical = scans
      ? scans.reduce((s, sc) => s + (sc.critical_count || 0), 0)
      : 0
    const completed = batch?.completed_urls || pagesCompleted || 0
    const failed = batch?.failed_urls || pagesFailed || 0

    const scoreColor = avgScore >= 75 ? '#22D3A0' : avgScore >= 50 ? '#F59E0B' : '#EF4444'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wcagscannerr.com'

    // Send email via Resend
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY!)

    await resend.emails.send({
      from: 'WCAG Scanner <reports@wcagscannerr.com>',
      to: profile.email,
      subject: `Monitoring Scan: ${url} — ${completed} pages scanned, avg ${avgScore}/100`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px;">
          <h1 style="color: #6C47FF; margin-bottom: 4px;">Monitoring Scan Complete</h1>
          <p style="color: #8B8BA7;">${url}</p>

          <div style="background: #111118; border: 1px solid #2A2A3A; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-around; text-align: center;">
              <div>
                <div style="font-size: 56px; font-weight: 800; color: ${scoreColor};">${avgScore}/100</div>
                <div style="color: #8B8BA7; font-size: 12px; margin-top: 4px;">Average Score</div>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #22D3A0;">${completed}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Pages</div>
            </div>
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #EF4444;">${totalViolations}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Issues</div>
            </div>
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: ${failed > 0 ? '#F59E0B' : '#8B8BA7'};">${failed}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Failed</div>
            </div>
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: ${totalCritical > 0 ? '#EF4444' : '#22D3A0'};">${totalCritical}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Critical</div>
            </div>
          </div>

          <a href="${appUrl}/batch/${batchId}"
            style="display: inline-block; background: #6C47FF; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Per-Page Breakdown →
          </a>

          <p style="color: #8B8BA7; font-size: 11px; margin-top: 32px; border-top: 1px solid #2A2A3A; padding-top: 16px;">
            Automated scan using axe-core across ${completed} pages. Results are not legal advice.
          </p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, emailSent: true })
  } catch (err) {
    console.error('[MONITORING CALLBACK] Failed:', err)
    return NextResponse.json({ error: 'Callback failed' }, { status: 500 })
  }
}
