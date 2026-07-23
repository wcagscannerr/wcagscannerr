import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { siteId, userId, scanId, reportId, url, score, totalViolations, pagesScanned, pagesCompleted, pagesFailed } = body

  if (!siteId || !scanId || !url) {
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

    // Send email via Resend
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY!)

    const scoreColor = score >= 75 ? '#22D3A0' : score >= 50 ? '#F59E0B' : '#EF4444'
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wcagscannerr.com'

    await resend.emails.send({
      from: 'WCAG Scanner <reports@wcagscannerr.com>',
      to: profile.email,
      subject: `Monitoring Report: ${url} scored ${score}/100 (${pagesCompleted} pages scanned)`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0A0A0F; color: #F0F0FF; padding: 40px; border-radius: 12px;">
          <h1 style="color: #6C47FF; margin-bottom: 4px;">Monitoring Scan Report</h1>
          <p style="color: #8B8BA7;">${url}</p>

          <div style="background: #111118; border: 1px solid #2A2A3A; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
            <div style="font-size: 56px; font-weight: 800; color: ${scoreColor};">${score}/100</div>
            <div style="color: #8B8BA7; margin-top: 8px;">Compliance Score</div>
          </div>

          <div style="display: flex; gap: 12px; margin-bottom: 24px;">
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #22D3A0;">${pagesCompleted}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Pages Scanned</div>
            </div>
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #EF4444;">${totalViolations}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Issues Found</div>
            </div>
            <div style="flex: 1; background: #111118; border: 1px solid #2A2A3A; border-radius: 8px; padding: 16px; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: ${pagesFailed > 0 ? '#F59E0B' : '#8B8BA7'};">${pagesFailed}</div>
              <div style="color: #8B8BA7; font-size: 12px;">Failed</div>
            </div>
          </div>

          <a href="${appUrl}/reports/${reportId}"
            style="display: inline-block; background: #6C47FF; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
            View Full Report →
          </a>

          <p style="color: #8B8BA7; font-size: 11px; margin-top: 32px; border-top: 1px solid #2A2A3A; padding-top: 16px;">
            Automated scan using axe-core across ${pagesCompleted} pages. Results are not legal advice.
            Detects ~57% of WCAG issues automatically.
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
