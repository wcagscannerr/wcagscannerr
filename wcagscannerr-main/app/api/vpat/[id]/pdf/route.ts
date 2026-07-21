import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { buildConformanceTable, ConformanceLevel, summarizeConformance } from '@/lib/vpat/conformance';
import { launchBrowser } from '@/lib/scanner/engine';
import { buildVpatHtml, vpatPdfOptions } from '@/lib/vpat/renderhtml';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: vpat } = await db
    .from('vpat_reports')
    .select('*, scans(url, compliance_score)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (!vpat) return new Response('Not found', { status: 404 });

  const { data: violations } = await db
    .from('violations')
    .select('rule_id, impact, fix_summary, node_count, tags')
    .eq('scan_id', vpat.scan_id);

  const baseTable = buildConformanceTable(
    (violations || []).map((v: any) => ({
      id: v.rule_id,
      impact: v.impact,
      help: v.fix_summary,
      node_count: v.node_count || 1,
      tags: v.tags,
    }))
  );

  const overrides = (vpat.criterion_overrides || {}) as Record<string, { level: ConformanceLevel; remarks: string }>;
  const table = baseTable.map((row) => {
    const override = overrides[row.criterion.number];
    return override ? { ...row, level: override.level, remarks: override.remarks } : row;
  });

  const summary = summarizeConformance(table);
  const scan = vpat.scans as any;

  const html = buildVpatHtml({
    vpat,
    scan,
    table,
    summary,
    isFinal: vpat.status === 'finalized',
  });

  let browser = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf(vpatPdfOptions(vpat));

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="VPAT-${vpat.product_name.replace(/[^a-z0-9]/gi, '-')}.pdf"`,
      },
    });
  } catch (err) {
    console.error('VPAT PDF generation failed:', err);
    return new Response('PDF generation failed', { status: 500 });
  } finally {
    if (browser) await browser.close();
  }
}