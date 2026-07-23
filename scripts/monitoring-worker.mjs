#!/usr/bin/env node

/**
 * Monitoring Site Scanner
 *
 * Runs on GitHub Actions to scan an entire monitored website (up to 25 pages).
 * Discovers internal links, scans each page with axe-core via Puppeteer,
 * aggregates results into a single scan record + violations, then calls
 * back to Vercel for email notification.
 *
 * Flow:
 * 1. Parse args (site_id, user_id, base_url, max_pages)
 * 2. Discover same-origin internal links from base_url
 * 3. Scan each page with Puppeteer + axe-core
 * 4. Aggregate violations/scores across all pages
 * 5. Create scan record + violations + report in Supabase
 * 6. Update monitored_sites with latest scan info
 * 7. Call back to Vercel to send email notification
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';

// ── Parse CLI args ──
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value;
  return acc;
}, {});

const {
  'site-id': siteId,
  'user-id': userId,
  'base-url': baseUrl,
  'max-pages': maxPagesStr = '25',
} = args;

const maxPages = parseInt(maxPagesStr, 10) || 25;

if (!siteId || !userId || !baseUrl) {
  console.error('Missing required arguments: site-id, user-id, base-url');
  process.exit(1);
}

console.log('=== Monitoring Site Scanner ===');
console.log(`Site ID: ${siteId}`);
console.log(`User ID: ${userId}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Max Pages: ${maxPages}`);

// ── Supabase client ──
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://www.wcagscannerr.com';
const CRON_SECRET = process.env.CRON_SECRET;

// ── WCAG tag → criterion mapping (mirrors lib/vpat/wcagMapping.ts) ──
const WCAG_TAG_TO_CRITERION = {
  wcag111: '1.1.1', wcag121: '1.2.1', wcag122: '1.2.2', wcag123: '1.2.3',
  wcag124: '1.2.4', wcag125: '1.2.5', wcag131: '1.3.1', wcag132: '1.3.2',
  wcag133: '1.3.3', wcag134: '1.3.4', wcag135: '1.3.5', wcag136: '1.3.6',
  wcag141: '1.4.1', wcag142: '1.4.2', wcag143: '1.4.3', wcag144: '1.4.4',
  wcag145: '1.4.5', wcag146: '1.4.6', wcag147: '1.4.7', wcag148: '1.4.8',
  wcag149: '1.4.9', wcag1410: '1.4.10', wcag1411: '1.4.11', wcag1412: '1.4.12',
  wcag1413: '1.4.13',
  wcag211: '2.1.1', wcag212: '2.1.2', wcag213: '2.1.3', wcag214: '2.1.4',
  wcag221: '2.2.1', wcag222: '2.2.2', wcag223: '2.2.3', wcag224: '2.2.4',
  wcag225: '2.2.5', wcag226: '2.2.6', wcag231: '2.3.1', wcag232: '2.3.2',
  wcag233: '2.3.3', wcag241: '2.4.1', wcag242: '2.4.2', wcag243: '2.4.3',
  wcag244: '2.4.4', wcag245: '2.4.5', wcag246: '2.4.6', wcag247: '2.4.7',
  wcag248: '2.4.8', wcag249: '2.4.9', wcag2410: '2.4.10', wcag2411: '2.4.11',
  wcag2412: '2.4.12', wcag2413: '2.4.13', wcag251: '2.5.1', wcag252: '2.5.2',
  wcag253: '2.5.3', wcag254: '2.5.4', wcag255: '2.5.5', wcag256: '2.5.6',
  wcag257: '2.5.7', wcag258: '2.5.8',
  wcag311: '3.1.1', wcag312: '3.1.2', wcag313: '3.1.3', wcag314: '3.1.4',
  wcag315: '3.1.5', wcag316: '3.1.6', wcag321: '3.2.1', wcag322: '3.2.2',
  wcag323: '3.2.3', wcag324: '3.2.4', wcag325: '3.2.5', wcag326: '3.2.6',
  wcag331: '3.3.1', wcag332: '3.3.2', wcag333: '3.3.3', wcag334: '3.3.4',
  wcag335: '3.3.5', wcag336: '3.3.6', wcag337: '3.3.7', wcag338: '3.3.8',
  wcag339: '3.3.9',
  wcag411: '4.1.1', wcag412: '4.1.2', wcag413: '4.1.3',
};

function mapWcagTag(tags) {
  if (!tags || !Array.isArray(tags)) return 'N/A';
  for (const tag of tags) {
    const m = WCAG_TAG_TO_CRITERION[tag];
    if (m) return m;
  }
  return 'N/A';
}

// ── Chromium path helper ──
async function getChromiumPath() {
  const paths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
  const { existsSync } = await import('fs');
  for (const p of paths) {
    if (existsSync(p)) return p;
  }
  const { execSync } = await import('child_process');
  try {
    return execSync('which chromium-browser || which chromium', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Chromium not found.');
  }
}

// ── Discover internal links ──
async function discoverLinks(page, origin, maxLinks) {
  try {
    const links = await page.evaluate((origin, maxLinks) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const seen = new Set();
      const results = [];
      for (const a of anchors) {
        try {
          const url = new URL(a.href);
          if (url.origin === origin) {
            const normalized = url.origin + url.pathname.replace(/\/$/, '') + url.search;
            if (!seen.has(normalized)) {
              seen.add(normalized);
              results.push(normalized);
            }
          }
        } catch {}
        if (results.length >= maxLinks) break;
      }
      return results;
    }, origin, maxLinks + 10);

    // Deduplicate and ensure base URL is first
    const basePath = new URL(page.url()).origin + new URL(page.url()).pathname.replace(/\/$/, '');
    const filtered = links.filter(l => l !== basePath);
    return [basePath, ...filtered].slice(0, maxLinks);
  } catch (err) {
    console.error(`Link discovery failed:`, err.message);
    return [page.url()];
  }
}

// ── Run axe-core on a page ──
async function runAxeScan(page) {
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js',
  });
  await page.waitForFunction('typeof window.axe !== "undefined"', { timeout: 10000 });

  const runTags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

  return await page.evaluate((tags) => {
    return new Promise((resolve) => {
      window.axe.run(
        { runOnly: { type: 'tag', values: tags } },
        (err, results) => {
          if (err) return resolve({ violations: [], passes: 0 });
          resolve({
            violations: results.violations.map(v => ({
              id: v.id,
              impact: v.impact || 'minor',
              description: v.description,
              help: v.help,
              helpUrl: v.helpUrl,
              tags: v.tags,
              nodeCount: v.nodes.length,
              nodes: v.nodes.slice(0, 10).map(n => ({
                html: (n.html || '').substring(0, 300),
                target: n.target,
                failureSummary: n.failureSummary || '',
              })),
            })),
            passes: results.passes.length,
          });
        }
      );
    });
  }, runTags);
}

// ── Scan a single page ──
async function scanPage(browser, url) {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setBypassCSP(true);

    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    } catch {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }

    await new Promise(r => setTimeout(r, 1000));
    const axeResults = await runAxeScan(page);

    let critical = 0, serious = 0, moderate = 0, minor = 0;
    for (const v of axeResults.violations) {
      const n = Math.max(1, v.nodeCount || 1);
      if (v.impact === 'critical') critical += n;
      else if (v.impact === 'serious') serious += n;
      else if (v.impact === 'moderate') moderate += n;
      else minor += n;
    }

    const failPoints =
      Math.min(critical, 50) * 10 +
      Math.min(serious, 80) * 6 +
      Math.min(moderate, 100) * 3 +
      Math.min(minor, 200) * 1;
    const passPoints = axeResults.passes * 2;
    const totalPoints = passPoints + failPoints + 100;
    const score = Math.round(((passPoints + 100) / totalPoints) * 100);

    return {
      url,
      score: Math.max(18, Math.min(100, score)),
      violations: axeResults.violations,
      critical, serious, moderate, minor,
      totalViolations: critical + serious + moderate + minor,
    };
  } finally {
    await page.close();
  }
}

// ── Compute Big Six from all violations ──
function computeBigSix(allViolations) {
  const ruleCounts = {};
  for (const v of allViolations) {
    ruleCounts[v.id] = (ruleCounts[v.id] || 0) + v.nodeCount;
  }
  const sorted = Object.entries(ruleCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);
  return sorted.map(([ruleId, count]) => ({ ruleId, instances: count }));
}

// ── Main ──
async function main() {
  let browser;
  try {
    const chromiumPath = await getChromiumPath();
    console.log(`Using Chromium: ${chromiumPath}`);

    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    });

    // ── Step 1: Discover pages ──
    console.log('Discovering pages...');
    const discoveryPage = await browser.newPage();
    await discoveryPage.setViewport({ width: 1280, height: 720 });
    await discoveryPage.setBypassCSP(true);

    try {
      await discoveryPage.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch {
      await discoveryPage.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
      await new Promise(r => setTimeout(r, 2000));
    }

    const origin = new URL(baseUrl).origin;
    const urls = await discoverLinks(discoveryPage, origin, maxPages);
    await discoveryPage.close();

    console.log(`Found ${urls.length} pages to scan`);

    // ── Step 2: Scan each page ──
    const allViolations = [];
    let totalCritical = 0, totalSerious = 0, totalModerate = 0, totalMinor = 0;
    let pagesCompleted = 0, pagesFailed = 0;
    const perPageResults = [];

    for (let i = 0; i < urls.length; i++) {
      console.log(`[${i + 1}/${urls.length}] Scanning: ${urls[i]}`);
      try {
        const result = await scanPage(browser, urls[i]);
        allViolations.push(...result.violations.map(v => ({ ...v, page_url: urls[i] })));
        totalCritical += result.critical;
        totalSerious += result.serious;
        totalModerate += result.moderate;
        totalMinor += result.minor;
        pagesCompleted++;
        perPageResults.push({ url: urls[i], score: result.score, status: 'ok' });
        console.log(`  ✓ Score: ${result.score}, Violations: ${result.totalViolations}`);
      } catch (err) {
        pagesFailed++;
        perPageResults.push({ url: urls[i], status: 'failed', error: err.message });
        console.error(`  ✗ Failed: ${err.message}`);
      }
    }

    // ── Step 3: Compute aggregate metrics ──
    const totalViolations = totalCritical + totalSerious + totalModerate + totalMinor;
    const score = urls.length > 0
      ? Math.round(perPageResults
          .filter(r => r.status === 'ok')
          .reduce((sum, r) => sum + r.score, 0) / Math.max(1, pagesCompleted))
      : 0;
    const bigSix = computeBigSix(allViolations);

    console.log(`\nAggregate: Score=${score}, Violations=${totalViolations}, Pages=${pagesCompleted}, Failed=${pagesFailed}`);

    // ── Step 4: Create scan record ──
    const scanId = crypto.randomUUID();
    const { error: scanError } = await supabase.from('scans').insert({
      id: scanId,
      user_id: userId,
      url: baseUrl,
      status: 'completed',
      compliance_score: score,
      total_violations: totalViolations,
      critical_count: totalCritical,
      serious_count: totalSerious,
      moderate_count: totalModerate,
      minor_count: totalMinor,
      wcag_level: 'AA',
      wcag_version: '2.1',
      big_six: bigSix,
      pages_scanned: pagesCompleted + pagesFailed,
      pages_requested: urls.length,
      completed_at: new Date().toISOString(),
      keyboard_issues: [],
      viewport_breakdown: [],
      has_overlay_widget: false,
    });

    if (scanError) {
      console.error('Failed to create scan record:', scanError);
      throw scanError;
    }
    console.log(`Created scan: ${scanId}`);

    // ── Step 5: Insert violations ──
    if (allViolations.length > 0) {
      const violationsToInsert = allViolations.map((v, i) => ({
        scan_id: scanId,
        rule_id: v.id,
        rule_description: (v.description || v.help || '').slice(0, 500),
        impact: v.impact,
        wcag_criterion: mapWcagTag(v.tags),
        wcag_level: 'AA',
        page_url: v.page_url || baseUrl,
        element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
        element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
        node_count: v.nodeCount || 1,
        tags: v.tags || [],
        fix_summary: (v.help || '').slice(0, 500),
        fix_detail: (v.description || '').slice(0, 2000),
        help_url: v.helpUrl || '',
        sort_order: i,
      }));

      const { error: viError } = await supabase.from('violations').insert(violationsToInsert);
      if (viError) console.error('Failed to insert violations:', viError);
      else console.log(`Inserted ${violationsToInsert.length} violations`);
    }

    // ── Step 6: Create report ──
    const { data: report } = await supabase
      .from('reports')
      .insert({
        scan_id: scanId,
        user_id: userId,
        name: `Monitoring scan of ${baseUrl} - ${new Date().toLocaleDateString()}`,
        is_public: false,
      })
      .select('id')
      .single();

    const reportId = report?.id || null;
    console.log(`Created report: ${reportId}`);

    // ── Step 7: Update monitored_sites ──
    await supabase
      .from('monitored_sites')
      .update({
        last_scan_id: scanId,
        last_report_id: reportId,
        last_scanned_at: new Date().toISOString(),
      })
      .eq('id', siteId);

    console.log(`Updated monitored site ${siteId}`);

    // ── Step 8: Trigger alert check on Vercel ──
    try {
      const alertRes = await fetch(`${APP_URL}/api/monitoring/check-alerts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({ siteId, newScanId: scanId }),
      });
      if (!alertRes.ok) console.error('Alert check failed:', alertRes.status);
      else console.log('Alert check triggered');
    } catch (alertErr) {
      console.error('Alert check error:', alertErr.message);
    }

    // ── Step 9: Notify Vercel for email ──
    try {
      const callbackRes = await fetch(`${APP_URL}/api/cron/monitoring-callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${CRON_SECRET}`,
        },
        body: JSON.stringify({
          siteId,
          userId,
          scanId,
          reportId,
          url: baseUrl,
          score,
          totalViolations,
          pagesScanned: pagesCompleted + pagesFailed,
          pagesCompleted,
          pagesFailed,
        }),
      });
      if (!callbackRes.ok) console.error('Callback failed:', callbackRes.status);
      else {
        const body = await callbackRes.json();
        console.log('Callback response:', body);
      }
    } catch (cbErr) {
      console.error('Callback error:', cbErr.message);
    }

    console.log('\n=== Monitoring Scan Complete ===');
    console.log(`Pages scanned: ${pagesCompleted}/${urls.length}`);
    console.log(`Score: ${score}`);
    console.log(`Violations: ${totalViolations}`);
    console.log(`Report: ${reportId}`);

  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
