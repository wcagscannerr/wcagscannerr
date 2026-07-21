import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { buildConformanceTable, ConformanceLevel, summarizeConformance } from '@/lib/vpat/conformance';
import { launchBrowser } from '@/lib/scanner/engine';
import { buildVpatHtml, vpatPdfOptions } from '@/lib/vpat/renderhtml';

// Finalize a VPAT: mark it as finalized AND generate + store the ACR PDF
// so the user gets a downloadable Accessibility Conformance Report.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: vpat, error: vpatError } = await db
    .from('vpat_reports')
    .select('*, scans(url, compliance_score)')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single();

  if (vpatError || !vpat) {
    return NextResponse.json({ error: 'VPAT not found' }, { status: 404 });
  }

  // Mark as finalized
  const { error: updateError } = await db
    .from('vpat_reports')
    .update({ status: 'finalized', finalized_at: new Date().toISOString() })
    .eq('id', params.id);

  if (updateError) {
    console.error('Failed to finalize VPAT:', updateError);
    return NextResponse.json({ error: 'Failed to finalize' }, { status: 500 });
  }

  // Generate the ACR PDF (same shared template as the /pdf route)
  try {
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
      isFinal: true,
    });

    let browser = null;
    try {
      browser = await launchBrowser();
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf(vpatPdfOptions(vpat));

      // Upload to storage bucket (reuse scan-screenshots bucket)
      const fileName = `acr-${vpat.id}.pdf`;
      const { data: uploadData, error: uploadError } = await db.storage
        .from('scan-screenshots')
        .upload(fileName, pdfBuffer, { contentType: 'application/pdf', upsert: true });

      if (uploadError) {
        console.warn('[VPAT] ACR PDF upload failed:', uploadError.message);
      } else if (uploadData) {
        const { data: publicUrlData } = db.storage.from('scan-screenshots').getPublicUrl(fileName);
        const acrPdfUrl = publicUrlData.publicUrl;

        await db
          .from('vpat_reports')
          .update({ acr_pdf_url: acrPdfUrl })
          .eq('id', params.id);
      }
    } finally {
      if (browser) await browser.close();
    }
  } catch (pdfErr) {
    console.error('[VPAT] ACR PDF generation failed (finalize still succeeded):', pdfErr);
  }

  return NextResponse.json({ success: true, status: 'finalized' });
}