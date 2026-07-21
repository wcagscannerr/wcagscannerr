import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

const checkAlertsSchema = z.object({
  siteId: z.string().uuid(),
  newScanId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const db = createServiceClient()

    // Two legitimate callers hit this route:
    //  1. The monitoring cron (server-to-server `fetch`, no browser session —
    //     it authenticates with the CRON_SECRET bearer token instead).
    //  2. A logged-in user's browser, which has a real Supabase session.
    // The old version only ever checked for a session, so the cron's call
    // — which only ever sends the CRON_SECRET header — was unauthenticated
    // every single time, got a 401, and the error was silently swallowed
    // by the caller. That's why alerts never actually got created even
    // though scans were completing fine.
    const authHeader = request.headers.get('authorization')
    const isCronCall = authHeader === `Bearer ${process.env.CRON_SECRET}`

    let sessionUserId: string | null = null
    if (!isCronCall) {
      const authClient = await createClient()
      const { data: { user } } = await authClient.auth.getUser()
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      sessionUserId = user.id
    }

    const body = await request.json()
    const parsed = checkAlertsSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { siteId, newScanId } = parsed.data

    const { data: site } = await db
      .from('monitored_sites')
      .select('id, user_id, url')
      .eq('id', siteId)
      .single()

    if (!site) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 })
    }

    // A browser-session caller must own the site. A cron-authenticated
    // caller is trusted server-side and always acts as the site's owner.
    if (sessionUserId && site.user_id !== sessionUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const ownerId = site.user_id

    const { data: newScan } = await db
      .from('scans')
      .select('id, compliance_score, critical_count, serious_count, total_violations, status, completed_at')
      .eq('id', newScanId)
      .single()

    if (!newScan || newScan.status !== 'completed') {
      return NextResponse.json(
        { error: 'New scan not found or incomplete' },
        { status: 400 }
      )
    }

    const { data: previousScans } = await db
      .from('scans')
      .select('id, compliance_score, critical_count, serious_count, total_violations, completed_at')
      .eq('url', site.url)
      .eq('status', 'completed')
      .neq('id', newScanId)
      .order('completed_at', { ascending: false })
      .limit(1)

    const previousScan = previousScans?.[0]

    const alertsToInsert: Array<{
      user_id: string
      site_id: string
      scan_id: string
      alert_type: string
      message: string
      previous_value: number | null
      current_value: number | null
      read: boolean
    }> = []

    if (previousScan && previousScan.compliance_score !== null && newScan.compliance_score !== null) {
      const scoreDiff = previousScan.compliance_score - newScan.compliance_score
      if (scoreDiff >= 10) {
        alertsToInsert.push({
          user_id: ownerId,
          site_id: siteId,
          scan_id: newScanId,
          alert_type: 'score_drop',
          message: `Score dropped from ${previousScan.compliance_score} to ${newScan.compliance_score} on ${site.url}`,
          previous_value: previousScan.compliance_score,
          current_value: newScan.compliance_score,
          read: false,
        })
      }
    }

    if (previousScan && newScan.critical_count > previousScan.critical_count) {
      const newCritical = newScan.critical_count - previousScan.critical_count
      alertsToInsert.push({
        user_id: ownerId,
        site_id: siteId,
        scan_id: newScanId,
        alert_type: 'new_critical',
        message: `${newCritical} new critical issue${newCritical > 1 ? 's' : ''} found on ${site.url}`,
        previous_value: previousScan.critical_count,
        current_value: newScan.critical_count,
        read: false,
      })
    }

    if (previousScan && (newScan.serious_count - previousScan.serious_count) >= 3) {
      const newSerious = newScan.serious_count - previousScan.serious_count
      alertsToInsert.push({
        user_id: ownerId,
        site_id: siteId,
        scan_id: newScanId,
        alert_type: 'new_serious',
        message: `${newSerious} new serious issues found on ${site.url}`,
        previous_value: previousScan.serious_count,
        current_value: newScan.serious_count,
        read: false,
      })
    }

    if (previousScan && newScan.total_violations < previousScan.total_violations) {
      const fixed = previousScan.total_violations - newScan.total_violations
      alertsToInsert.push({
        user_id: ownerId,
        site_id: siteId,
        scan_id: newScanId,
        alert_type: 'fixed',
        message: `Great job! ${fixed} issue${fixed > 1 ? 's' : ''} fixed on ${site.url}`,
        previous_value: previousScan.total_violations,
        current_value: newScan.total_violations,
        read: false,
      })
    }

    if (alertsToInsert.length > 0) {
      const { error: insertError } = await db
        .from('monitoring_alerts')
        .insert(alertsToInsert)

      if (insertError) {
        console.error('[ALERTS] Insert failed:', insertError)
        return NextResponse.json(
          { error: 'Failed to create alerts' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      alertsCreated: alertsToInsert.length,
      alerts: alertsToInsert.map(a => ({
        type: a.alert_type,
        message: a.message,
        previousValue: a.previous_value,
        currentValue: a.current_value,
      })),
    })
  } catch (error: any) {
    console.error('[ALERTS] POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const db = createServiceClient()

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 100)
    const offset = parseInt(searchParams.get('offset') || '0', 10)
    const unreadOnly = searchParams.get('unread') === 'true'

    let query = db
      .from('monitoring_alerts')
      .select('*, monitored_sites(url), scans(compliance_score)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (unreadOnly) {
      query = query.eq('read', false)
    }

    const { data: alerts, error } = await query

    if (error) {
      console.error('[ALERTS] Fetch failed:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    const { count: unreadCount } = await db
      .from('monitoring_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false)

    // Look up report IDs for each alert's scan_id
    const scanIds = [...new Set((alerts || []).map((a: any) => a.scan_id).filter(Boolean))]
    let reportMap: Record<string, string> = {}
    if (scanIds.length > 0) {
      const { data: reports } = await db
        .from('reports')
        .select('id, scan_id')
        .in('scan_id', scanIds)
      if (reports) {
        for (const r of reports) {
          if (!reportMap[r.scan_id]) reportMap[r.scan_id] = r.id
        }
      }
    }

    const alertsWithReports = (alerts || []).map((a: any) => ({
      ...a,
      report_id: reportMap[a.scan_id] || null,
    }))

    return NextResponse.json({
      alerts: alertsWithReports,
      unreadCount: unreadCount || 0,
      pagination: { limit, offset, hasMore: (alerts?.length || 0) === limit },
    })
  } catch (error: any) {
    console.error('[ALERTS] GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}