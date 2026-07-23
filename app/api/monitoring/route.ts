import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/dodo/plans';
import { z } from 'zod';
import { lookupSiteGeo } from '@/lib/monitoring/geoLookup';

const createMonitorSchema = z.object({
  url: z.string().url(),
  // 'daily' was removed — scanning 25 pages daily via GH Actions is wasteful.
  frequency: z.enum(['weekly', 'monthly']).optional().default('weekly'),
});

const toggleMonitorSchema = z.object({
  id: z.string().uuid(),
  revoked_at: z.boolean(),
});

const deleteMonitorSchema = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: sites, error } = await supabase
      .from('monitored_sites')
      .select(`
        id, url, label, scan_frequency, last_scanned_at, last_scan_id, last_report_id, last_batch_id,
        revoked_at, created_at,
        geo_lat, geo_lng, geo_country, geo_city, geo_looked_up_at,
        last_scan:scans!monitored_sites_last_scan_id_fkey (
          compliance_score,
          total_violations,
          critical_count,
          serious_count,
          moderate_count,
          minor_count,
          status,
          completed_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch monitored sites:', error);
      return NextResponse.json({ error: 'Failed to fetch monitored sites' }, { status: 500 });
    }

    // Backfill real geo-IP data for any sites that predate this feature
    // (geo_looked_up_at is null = "never tried"). Capped at 3 per request
    // so an account with many un-geolocated sites doesn't turn a dashboard
    // load into a slow chain of DNS + external API calls — the rest just
    // fill in on subsequent loads.
    const needsGeo = (sites || []).filter((s) => !s.geo_looked_up_at).slice(0, 3);
    for (const site of needsGeo) {
      const geo = await lookupSiteGeo(site.url);
      const update = geo
        ? { geo_lat: geo.lat, geo_lng: geo.lng, geo_country: geo.country, geo_city: geo.city, geo_looked_up_at: new Date().toISOString() }
        : { geo_looked_up_at: new Date().toISOString() }; // tried and failed — don't keep retrying every load
      await supabase.from('monitored_sites').update(update).eq('id', site.id);
      Object.assign(site, update);
    }

    // Real 7-day score trend, built from actual scan history — not faked.
    // We pull every completed scan against any of this user's monitored
    // URLs from the last 7 days and average by calendar day. Days with no
    // scan simply carry forward null (the frontend can choose to skip or
    // interpolate); we do NOT repeat "today's score" across every day,
    // since that produced a flat, meaningless line that looked broken.
    const urls = (sites || []).map((s) => s.url);
    let trend: { date: string; score: number | null; violations: number }[] = [];

    if (urls.length > 0) {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: history } = await supabase
        .from('scans')
        .select('compliance_score, total_violations, completed_at')
        .eq('user_id', user.id)
        .in('url', urls)
        .eq('status', 'completed')
        .gte('completed_at', sevenDaysAgo.toISOString())
        .order('completed_at', { ascending: true });

      const byDay = new Map<string, { scores: number[]; violations: number }>();
      for (const row of history || []) {
        const day = new Date(row.completed_at).toISOString().slice(0, 10);
        if (!byDay.has(day)) byDay.set(day, { scores: [], violations: 0 });
        const entry = byDay.get(day)!;
        if (row.compliance_score != null) entry.scores.push(row.compliance_score);
        entry.violations += row.total_violations || 0;
      }

      trend = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        const key = d.toISOString().slice(0, 10);
        const entry = byDay.get(key);
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          score: entry?.scores.length
            ? Math.round(entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length)
            : null,
          violations: entry?.violations || 0,
        };
      });
    }

    // ── Batch-level aggregates ──
    // Fetch scans from each site's last_batch to compute accurate
    // average score + total violations across ALL pages in the batch.
    const batchIds = (sites || [])
      .map(s => (s as any).last_batch_id)
      .filter(Boolean) as string[];

    let batchAggregates: Record<string, { avgScore: number; totalViolations: number; criticalCount: number; seriousCount: number; completedAt: string | null }> = {};

    if (batchIds.length > 0) {
      const { data: batchScans } = await supabase
        .from('scans')
        .select('batch_id, compliance_score, total_violations, critical_count, serious_count, status, completed_at')
        .in('batch_id', batchIds);

      const scansByBatch: Record<string, any[]> = {};
      for (const s of batchScans || []) {
        if (!scansByBatch[s.batch_id]) scansByBatch[s.batch_id] = [];
        scansByBatch[s.batch_id].push(s);
      }

      for (const [batchId, scans] of Object.entries(scansByBatch)) {
        const completed = scans.filter((s: any) => s.status === 'completed');
        const avgScore = completed.length > 0
          ? Math.round(completed.reduce((sum: number, s: any) => sum + (s.compliance_score || 0), 0) / completed.length)
          : 0;
        const totalViolations = completed.reduce((sum: number, s: any) => sum + (s.total_violations || 0), 0);
        const criticalCount = completed.reduce((sum: number, s: any) => sum + (s.critical_count || 0), 0);
        const seriousCount = completed.reduce((sum: number, s: any) => sum + (s.serious_count || 0), 0);
        const latestCompleted = completed.length > 0
          ? completed.reduce((latest: any, s: any) => !latest || (s.completed_at > latest.completed_at) ? s : latest)
          : null;
        batchAggregates[batchId] = {
          avgScore,
          totalViolations,
          criticalCount,
          seriousCount,
          completedAt: latestCompleted?.completed_at || null,
        };
      }
    }

    // Attach batch aggregates to each site
    const sitesWithBatch = (sites || []).map((site: any) => {
      const batchAgg = site.last_batch_id ? batchAggregates[site.last_batch_id] : null;
      return {
        ...site,
        batch_aggregate: batchAgg || null,
      };
    });

    return NextResponse.json({ sites: sitesWithBatch, trend });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check plan limits
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const planLimits = PLANS[profile?.subscription_status || 'free']?.limits || PLANS.free.limits;

    // Free plan cannot monitor
    if (planLimits.monitoredSites === 0) {
      return NextResponse.json(
        { error: 'Site monitoring is available on Pro and Agency plans. Upgrade to continue.' },
        { status: 403 }
      );
    }

    const { count } = await supabase
      .from('monitored_sites')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if ((count || 0) >= planLimits.monitoredSites) {
      return NextResponse.json(
        { error: `You can only monitor ${planLimits.monitoredSites} sites on your plan. Upgrade to add more.` },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = createMonitorSchema.safeParse(body);
    if (!parsed.success) {
      // Return a readable message instead of the raw Zod flatten() object,
      // which just dumped as "[object Object]"-ish noise into the
      // frontend's alert().
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        { error: firstIssue ? `${firstIssue.path.join('.')}: ${firstIssue.message}` : 'Invalid request' },
        { status: 400 }
      );
    }

    const { url, frequency } = parsed.data;

    // Best-effort, bounded lookup (5s internal timeout — see geoLookup.ts)
    // so a slow/unreachable geolocation API can't hang site creation.
    // Failure just means geo_looked_up_at gets set with no lat/lng, i.e.
    // "Location unknown" — never a guessed location.
    const geo = await lookupSiteGeo(url);

    const { data: site, error } = await supabase
      .from('monitored_sites')
      .insert({
        user_id: user.id,
        url,
        scan_frequency: frequency,
        revoked_at: true,
        geo_lat: geo?.lat ?? null,
        geo_lng: geo?.lng ?? null,
        geo_country: geo?.country ?? null,
        geo_city: geo?.city ?? null,
        geo_looked_up_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to create monitored site:', error);
      return NextResponse.json({ error: 'Failed to create monitored site' }, { status: 500 });
    }

    return NextResponse.json({ site });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = toggleMonitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { id, revoked_at } = parsed.data;

    const { error } = await supabase
      .from('monitored_sites')
      .update({ revoked_at })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to toggle site:', error);
      return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = deleteMonitorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { error } = await supabase
      .from('monitored_sites')
      .delete()
      .eq('id', parsed.data.id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete monitored site:', error);
      return NextResponse.json({ error: 'Failed to delete monitored site' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}