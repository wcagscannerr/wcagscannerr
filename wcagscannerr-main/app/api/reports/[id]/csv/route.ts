import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import ExcelJS from 'exceljs';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: report, error } = await supabase
      .from('reports')
      .select('*, scans(*)')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single();

    if (error || !report) {
      console.log('Excel report lookup failed:', error, params.id, user.id);
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const scan = report.scans as any;
    const scanDate = new Date(report.created_at).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const { data: violations } = await supabase
      .from('violations')
      .select('*')
      .eq('scan_id', report.scan_id)
      .order('impact', { ascending: false });

    const score = scan?.compliance_score ?? 0;
    const criticalCount = scan?.critical_count ?? 0;
    const seriousCount = scan?.serious_count ?? 0;
    const moderateCount = scan?.moderate_count ?? 0;
    const minorCount = scan?.minor_count ?? 0;
    const totalViolations = scan?.total_violations ?? (violations?.length ?? 0);
    const bigSix = scan?.big_six || {};

    // Create workbook
    const workbook = new ExcelJS.Workbook();

    // ── SUMMARY SHEET ──
    const summarySheet = workbook.addWorksheet('Summary', { pageSetup: { paperSize: 9, orientation: 'portrait' } });
    summarySheet.columns = [
      { width: 35 },
      { width: 30 },
    ];

    // Title
    summarySheet.mergeCells('A1:B1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = 'WCAG ACCESSIBILITY COMPLIANCE REPORT';
    titleCell.font = { size: 18, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3E8F' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Website info
    summarySheet.getCell('A2').value = 'Website:';
    summarySheet.getCell('A2').font = { bold: true };
    summarySheet.getCell('B2').value = scan?.url || 'Unknown';

    summarySheet.getCell('A3').value = 'Scan Date:';
    summarySheet.getCell('A3').font = { bold: true };
    summarySheet.getCell('B3').value = scanDate;

    summarySheet.getCell('A4').value = 'Report ID:';
    summarySheet.getCell('A4').font = { bold: true };
    summarySheet.getCell('B4').value = params.id;

    // Compliance Score - Large highlight
    summarySheet.mergeCells('A6:B6');
    const scoreRow = summarySheet.getCell('A6');
    scoreRow.value = `COMPLIANCE SCORE: ${score}/100`;
    scoreRow.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    const scoreColor = score >= 75 ? 'FF22C55E' : score >= 50 ? 'FFFBBF24' : 'FFEF4444';
    scoreRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: scoreColor } };
    scoreRow.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(6).height = 25;

    // Severity breakdown
    summarySheet.getCell('A8').value = 'SEVERITY BREAKDOWN';
    summarySheet.getCell('A8').font = { bold: true, size: 12 };
    summarySheet.getCell('A8').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

    const severityData = [
      { level: 'Critical', count: criticalCount, color: 'FFEF4444' },
      { level: 'Serious', count: seriousCount, color: 'FFFF7A00' },
      { level: 'Moderate', count: moderateCount, color: 'FFFBBF24' },
      { level: 'Minor', count: minorCount, color: 'FF60A5FA' },
    ];

    let row = 9;
    for (const severity of severityData) {
      summarySheet.getCell(`A${row}`).value = severity.level;
      summarySheet.getCell(`A${row}`).font = { bold: true };
      summarySheet.getCell(`A${row}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: severity.color } };
      summarySheet.getCell(`B${row}`).value = severity.count;
      summarySheet.getCell(`B${row}`).font = { bold: true, size: 14 };
      summarySheet.getCell(`B${row}`).alignment = { horizontal: 'center' };
      row++;
    }

    summarySheet.getCell('A13').value = 'Total Violations:';
    summarySheet.getCell('A13').font = { bold: true };
    summarySheet.getCell('B13').value = totalViolations;

    // Big Six Section
    if (bigSix && Object.keys(bigSix).length > 0) {
      summarySheet.getCell('A15').value = 'BIG SIX VIOLATIONS (High Priority)';
      summarySheet.getCell('A15').font = { bold: true, size: 12, color: { argb: 'FFEF4444' } };
      summarySheet.getCell('A15').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE5E5' } };

      let bigSixRow = 16;
      const bigSixIssues = Object.entries(bigSix).filter(([_, count]) => typeof count === 'number' && count > 0);
      
      if (bigSixIssues.length > 0) {
        for (const [issue, count] of bigSixIssues) {
          summarySheet.getCell(`A${bigSixRow}`).value = `• ${issue}`;
          summarySheet.getCell(`B${bigSixRow}`).value = count as number;
          summarySheet.getCell(`A${bigSixRow}`).font = { bold: true };
          summarySheet.getCell(`B${bigSixRow}`).font = { bold: true, size: 12, color: { argb: 'FFEF4444' } };
          bigSixRow++;
        }
      } else {
        summarySheet.getCell(`A${bigSixRow}`).value = 'None detected - Great job!';
        summarySheet.getCell(`A${bigSixRow}`).font = { color: { argb: 'FF22C55E' } };
      }
    }

    // ── VIOLATIONS SHEET ──
    const violationsSheet = workbook.addWorksheet('Violations', { pageSetup: { paperSize: 9, orientation: 'landscape' } });

    violationsSheet.columns = [
      { header: 'Rule ID', key: 'rule_id', width: 20 },
      { header: 'Impact', key: 'impact', width: 12 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'WCAG Criterion', key: 'wcag_criterion', width: 15 },
      { header: 'Element HTML', key: 'element_html', width: 30 },
      { header: 'Fix Summary', key: 'fix_summary', width: 35 },
      { header: 'Help URL', key: 'help_url', width: 25 },
    ];

    // Style header row
    violationsSheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    violationsSheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D3E8F' } };
    violationsSheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

    // Add violations
    if (violations && violations.length > 0) {
      for (const v of violations as any[]) {
        const vRow = violationsSheet.addRow({
          rule_id: v.rule_id || v.id || '',
          impact: v.impact || '',
          description: v.rule_description || v.description || '',
          wcag_criterion: v.wcag_criterion || '',
          element_html: v.element_html || '',
          fix_summary: v.fix_summary || v.help || '',
          help_url: v.help_url || v.helpUrl || '',
        });

        // Color code by impact
        const impactColor: Record<string, string> = {
          critical: 'FFEF4444',
          serious: 'FFFF7A00',
          moderate: 'FFFBBF24',
          minor: 'FF60A5FA',
        };

        const cellColor = impactColor[v.impact] || 'FFFFFFFF';
        vRow.getCell('impact').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: cellColor } };
        vRow.getCell('impact').font = { bold: true, color: { argb: 'FFFFFFFF' } };
        vRow.eachCell({ includeEmpty: false }, (cell) => {
          cell.alignment = { wrapText: true, vertical: 'top' };
        });
      }
    } else {
      violationsSheet.addRow({
        rule_id: 'N/A',
        impact: 'N/A',
        description: 'No violations found. This scan detected no WCAG 2.1 Level AA issues.',
        wcag_criterion: 'N/A',
        element_html: 'N/A',
        fix_summary: 'N/A',
        help_url: 'N/A',
      });
    }

    // ── DISCLAIMER SHEET ──
    const disclaimerSheet = workbook.addWorksheet('Disclaimer');
    disclaimerSheet.columns = [{ width: 80 }];

    disclaimerSheet.getCell('A1').value = 'IMPORTANT INFORMATION';
    disclaimerSheet.getCell('A1').font = { size: 14, bold: true };

    disclaimerSheet.getCell('A3').value = 'Automated Scanning Limitation';
    disclaimerSheet.getCell('A3').font = { bold: true, size: 12 };
    disclaimerSheet.getCell('A4').value = 'This report was generated by automated scanning using axe-core (Deque Systems). Automated scans detect approximately 57% of WCAG issues. The remaining ~43% require manual review by accessibility experts.';
    disclaimerSheet.getCell('A4').alignment = { wrapText: true };

    disclaimerSheet.getCell('A6').value = 'Legal Disclaimer';
    disclaimerSheet.getCell('A6').font = { bold: true, size: 12 };
    disclaimerSheet.getCell('A7').value = 'Results do not constitute legal advice. This report is for informational purposes only. Consult a qualified attorney for compliance guidance and legal certainty regarding your specific accessibility obligations.';
    disclaimerSheet.getCell('A7').alignment = { wrapText: true };

    disclaimerSheet.getCell('A9').value = 'Remediation';
    disclaimerSheet.getCell('A9').font = { bold: true, size: 12 };
    disclaimerSheet.getCell('A10').value = 'Each violation includes a "Fix Summary" to guide remediation efforts. For complex issues, consider working with an accessibility consultant or development firm specializing in WCAG compliance.';
    disclaimerSheet.getCell('A10').alignment = { wrapText: true };

    // Generate Excel buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="wcag-report-${params.id}.xlsx"`,
      },
    });
  } catch (error: any) {
    console.error('Excel export error:', error);
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}