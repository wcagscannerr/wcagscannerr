import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

/**
 * Returns last 20 completed scans with anonymized category + score only.
 * NEVER exposes the scanned URL or domain publicly.
 */
export async function GET() {
  try {
    const db = createServiceClient();

    const { data: scans, error } = await db
      .from('scans')
      .select('id, compliance_score, url, created_at')
      .eq('status', 'completed')
      .not('compliance_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('scan-activity: query failed', error);
      return NextResponse.json({ activities: [] });
    }

    const activities = (scans || []).map((scan) => {
      const url = (scan.url || '').toLowerCase();
      let category = 'Website';

      if (/shop|store|cart|checkout|product|ecommerce/i.test(url)) {
        category = 'E-commerce';
      } else if (/blog|article|post|news/i.test(url)) {
        category = 'Blog';
      } else if (/saas|app\.|dashboard|login/i.test(url)) {
        category = 'SaaS';
      } else if (/portfolio|gallery|showcase/i.test(url)) {
        category = 'Portfolio';
      } else if (/edu|school|university|college|learn/i.test(url)) {
        category = 'Education';
      } else if (/gov|government|agency|.gov/i.test(url)) {
        category = 'Government';
      }

      return {
        id: scan.id,
        category,
        score: scan.compliance_score,
        created_at: scan.created_at,
      };
    });

    return NextResponse.json({ activities });
  } catch (err) {
    console.error('scan-activity: error', err);
    return NextResponse.json({ activities: [] });
  }
}