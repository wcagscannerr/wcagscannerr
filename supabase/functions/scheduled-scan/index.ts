/**
 * Supabase Edge Function: Scheduled Scan Runner
 *
 * Invoked by pg_cron or external scheduler to re-scan monitored sites.
 * Runs weekly by default. Each invocation picks up sites due for re-scan.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

function getAppUrl(): string {
  const configuredUrl = Deno.env.get('APP_URL')
    || Deno.env.get('NEXT_PUBLIC_APP_URL')
    || Deno.env.get('VERCEL_URL');

  if (!configuredUrl) {
    throw new Error('APP_URL or NEXT_PUBLIC_APP_URL must be set');
  }

  return configuredUrl.startsWith('http') ? configuredUrl : `https://${configuredUrl}`;
}

function getNextScanDate(frequency: string, lastScanned: string | null): Date {
  const now = new Date();
  if (!lastScanned) return now;

  const last = new Date(lastScanned);
  switch (frequency) {
    case 'weekly':
      last.setDate(last.getDate() + 7);
      break;
    case 'monthly':
      last.setMonth(last.getMonth() + 1);
      break;
    default:
      last.setDate(last.getDate() + 7); // fallback to weekly
      break;
  }
  return last;
}

Deno.serve(async (_req: Request) => {
  try {
    // Get sites due for scanning
    const { data: sites, error } = await supabase
      .from('monitored_sites')
      .select('*')
      .eq('revoked_at', true);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const now = new Date();
    let scanned = 0;
    let skipped = 0;
    const appUrl = getAppUrl();

    for (const site of sites || []) {
      if (!site.url) {
        skipped++;
        continue;
      }

      const nextScan = getNextScanDate(site.scan_frequency ?? 'weekly', site.last_scanned_at);

      if (nextScan > now) {
        skipped++;
        continue;
      }

      try {
        const scanRes = await fetch(`${appUrl}/api/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({
            url: site.url,
            max_pages: 5,
            wcag_level: 'AA',
          }),
        });

        const payload = await scanRes.json().catch(() => null);

        if (scanRes.ok && payload?.scan_id) {
          await supabase
            .from('monitored_sites')
            .update({
              last_scan_id: payload.scan_id,
              last_scanned_at: now.toISOString(),
            })
            .eq('id', site.id);

          scanned++;
        } else {
          console.error(`Scheduled scan failed for ${site.url}:`, payload?.error || scanRes.statusText);
        }
      } catch (err) {
        console.error(`Failed to scan ${site.url}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scanned,
        skipped,
        total: (sites || []).length,
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500 }
    );
  }
});