#!/usr/bin/env node

/**
 * Multi-Page Website Scanner
 * 
 * This script runs on GitHub Actions to scan multiple pages of a website.
 * It's separate from the Vercel-based scanning because:
 * - GitHub Actions runners have 7GB RAM vs Vercel Hobby's 1GB
 * - Can handle launching Chromium for multiple pages
 * - No timeout issues with long-running scans
 * 
 * Flow:
 * 1. Parse arguments (batch_id, user_id, base_url, page_count, etc.)
 * 2. Discover internal links from the base URL
 * 3. Scan each page using axe-core via Puppeteer
 * 4. Save results to Supabase database
 * 5. Notify Vercel API when complete
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
// Step 10: inline cross-scan violate-status carry-forward for the worker.
// .mjs can't import the .ts reconcileStatus helper, so we inline a
// minimal JS version of the same logic. Pre-launch — the underlying
// schema (violation_status table) lives server-side; the worker only
// writes rows via the service-role supabase client.
//
// Differences from lib/scanner/statusTracker.ts:
// - MD5 from node's built-in crypto.createHash (no bundled RFC 1321).
// - No metadata-column writes (we just upsert what schema needs).
async function stableKeyFor(v) {
  const h = crypto.createHash('md5');
  h.update(`${v.rule_id}|${v.page_url}|${v.element_html}`);
  return h.digest('hex');
}
async function reconcileStatusForWorker(userId, currentScanId, currentUrl, currentViolations) {
  if (!currentViolations || currentViolations.length === 0) {
    return { new_open: 0, carried_forward: 0, auto_resolved: 0, false_positives_kept: 0 };
  }
  const currentKeys = new Set();
  for (const v of currentViolations) currentKeys.add(await stableKeyFor(v));

  const { data: priorScan } = await supabase
    .from('scans')
    .select('id')
    .eq('user_id', userId)
    .eq('url', currentUrl)
    .eq('status', 'completed')
    .neq('id', currentScanId)
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const priorKeys = new Set();
  if (priorScan) {
    const { data: priorViolations } = await supabase
      .from('violations')
      .select('rule_id, page_url, element_html')
      .eq('scan_id', priorScan.id);
    for (const pv of priorViolations ?? []) {
      priorKeys.add(await stableKeyFor(pv));
    }
  }

  const allKeys = [...new Set([...currentKeys, ...priorKeys])];
  if (allKeys.length === 0) {
    return { new_open: 0, carried_forward: 0, auto_resolved: 0, false_positives_kept: 0 };
  }
  const { data: existingStatuses } = await supabase
    .from('violation_status')
    .select('*')
    .eq('user_id', userId)
    .in('stable_key', allKeys);
  const existingMap = new Map();
  for (const row of existingStatuses ?? []) {
    existingMap.set(row.stable_key, row);
  }

  const result = { new_open: 0, carried_forward: 0, auto_resolved: 0, false_positives_kept: 0 };

  // Carry forward.
  for (const v of currentViolations) {
    const key = await stableKeyFor(v);
    if (!existingMap.has(key)) continue;
    if (!priorKeys.has(key)) continue;
    await supabase.from('violation_status').update({
      last_seen_scan_id: currentScanId,
      updated_at: new Date().toISOString(),
    }).eq('user_id', userId).eq('stable_key', key);
    result.carried_forward += 1;
  }
  // New 'open' rows for keys without a prior status row.
  for (const v of currentViolations) {
    const key = await stableKeyFor(v);
    if (existingMap.has(key)) continue;
    await supabase.from('violation_status').insert({
      user_id: userId,
      stable_key: key,
      status: 'open',
      first_marked_scan_id: currentScanId,
      last_seen_scan_id: currentScanId,
    });
    result.new_open += 1;
  }
  // Auto-resolve / false-positive-keep for keys only in prior.
  if (priorScan) {
    for (const key of priorKeys) {
      if (currentKeys.has(key)) continue;
      const existing = existingMap.get(key);
      if (!existing) continue;
      if (existing.status === 'open' || existing.status === 'in_progress') {
        await supabase.from('violation_status').update({
          status: 'fixed',
          last_seen_scan_id: currentScanId,
          auto_resolved_count: (existing.auto_resolved_count ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq('user_id', userId).eq('stable_key', key);
        result.auto_resolved += 1;
      } else if (existing.status === 'false_positive') {
        result.false_positives_kept += 1;
      }
    }
  }
  return result;
}

// Step 8: helper to refund a single page-render credit if a per-page scan fails.
// Inline (no .ts import) since this is a Node ESM worker, not part of the
// Next.js bundle. Kept as a tiny helper here for parity with the per-URL
// page-render refund that lib/scanner/batchProcessor.ts issues — both code
// paths are the "inside worker, one URL failed" class of failure.
async function refundPageRenderOnFailure(userId, scanId, failureType = 'engine_failure') {
  try {
    await supabase.from('scan_credits_ledger').insert({
      user_id: userId,
      scan_id: scanId,
      metric: 'page_render',
      delta: 1,
      reason: 'scan_failed_refund',
      metadata: { failure_type: failureType, refunded_pages: 1, source: 'multiscan_worker' },
    });
  } catch (err) {
    console.error(`[WORKER] Page-render refund write failed for ${scanId}:`, err.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value;
  return acc;
}, {});

const {
  'batch-id': batchId,
  'user-id': userId,
  'base-url': baseUrl,
  'page-count': pageCountStr,
  'wcag-version': wcagVersion = '2.1',
  'wcag-level': wcagLevel = 'AA',
} = args;

const pageCount = parseInt(pageCountStr, 10) || 5;

if (!batchId || !userId || !baseUrl) {
  console.error('Missing required arguments: batch-id, user-id, base-url');
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://wcagscannerr.com';
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * Get the executable path for Chromium
 */
async function getChromiumPath() {
  // On GitHub Actions ubuntu runner, chromium is installed via apt
  const paths = [
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];
  
  for (const path of paths) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(path)) {
        return path;
      }
    } catch {}
  }
  
  // Fallback to puppeteer's bundled chromium
  const { execSync } = await import('child_process');
  try {
    return execSync('which chromium-browser || which chromium', { encoding: 'utf-8' }).trim();
  } catch {
    throw new Error('Chromium not found. Install chromium-browser.');
  }
}

/**
 * Discover internal links from a base URL
 */
async function discoverLinks(page, baseUrl, maxLinks) {
  const origin = new URL(baseUrl).origin;
  
  try {
    // Wait for page to load
    await page.goto(baseUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract internal links
    const links = await page.evaluate((origin, maxLinks) => {
      const anchors = Array.from(document.querySelectorAll('a[href]'));
      const internalLinks = new Set();
      
      for (const anchor of anchors) {
        try {
          const href = anchor.href;
          const url = new URL(href);
          
          // Only same-origin links
          if (url.origin === origin) {
            // Remove hash and trailing slash for deduplication
            const normalized = url.origin + url.pathname.replace(/\/$/, '') + url.search;
            internalLinks.add(normalized);
          }
        } catch {}
        
        if (internalLinks.size >= maxLinks) break;
      }
      
      return Array.from(internalLinks);
    }, origin, maxLinks + 10); // Get extra in case base URL is included
    
    // Ensure base URL is first
    const normalizedBase = new URL(baseUrl).origin + new URL(baseUrl).pathname.replace(/\/$/, '');
    const filtered = links.filter(l => l !== normalizedBase);
    
    return [normalizedBase, ...filtered].slice(0, maxLinks);
  } catch (err) {
    console.error(`Failed to discover links from ${baseUrl}:`, err.message);
    return [baseUrl]; // Fallback to just the base URL
  }
}

/**
 * Run axe-core scan on a page
 */
async function runAxeScan(page, wcagVersion) {
  // Inject axe-core
  await page.addScriptTag({
    url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js',
  });
  
  await page.waitForFunction('typeof window.axe !== "undefined"', { timeout: 10000 });
  
  // Determine which WCAG tags to run
  const runOnlyTags = wcagVersion === '2.2'
    ? ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
    : ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];
  
  // Run axe-core
  const results = await page.evaluate((tags) => {
    return new Promise((resolve, reject) => {
      window.axe.run(
        { runOnly: { type: 'tag', values: tags } },
        (err, results) => {
          if (err) return reject(err);
          
          // Process violations
          const violations = results.violations.map(v => ({
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
          }));
          
          resolve({
            violations,
            passes: results.passes.length,
          });
        }
      );
    });
  }, runOnlyTags);
  
  return results;
}

// Step 6: inline axe-tag → WCAG criterion helper. Kept here (a Node ESM
// worker, not part of the Next.js bundle) because .mjs can't import
// the .ts helper directly without a build step. Mirrors
// lib/vpat/wcagCriteria.ts → axeTag field — keep in sync if criteria
// are added/renamed in wcagCriteria.ts.
const WCAG_TAG_TO_CRITERION = {
  // ─ Perceivable ─
  wcag111: '1.1.1', wcag121: '1.2.1', wcag122: '1.2.2', wcag123: '1.2.3',
  wcag124: '1.2.4', wcag125: '1.2.5', wcag131: '1.3.1', wcag132: '1.3.2',
  wcag133: '1.3.3', wcag134: '1.3.4', wcag135: '1.3.5', wcag136: '1.3.6',
  wcag141: '1.4.1', wcag142: '1.4.2', wcag143: '1.4.3', wcag144: '1.4.4',
  wcag145: '1.4.5', wcag146: '1.4.6', wcag147: '1.4.7', wcag148: '1.4.8',
  wcag149: '1.4.9', wcag1410: '1.4.10', wcag1411: '1.4.11', wcag1412: '1.4.12',
  wcag1413: '1.4.13',
  // ─ Operable ─
  wcag211: '2.1.1', wcag212: '2.1.2', wcag213: '2.1.3', wcag214: '2.1.4',
  wcag221: '2.2.1', wcag222: '2.2.2', wcag223: '2.2.3', wcag224: '2.2.4',
  wcag225: '2.2.5', wcag226: '2.2.6', wcag231: '2.3.1', wcag232: '2.3.2',
  wcag233: '2.3.3', wcag241: '2.4.1', wcag242: '2.4.2', wcag243: '2.4.3',
  wcag244: '2.4.4', wcag245: '2.4.5', wcag246: '2.4.6', wcag247: '2.4.7',
  wcag248: '2.4.8', wcag249: '2.4.9', wcag2410: '2.4.10', wcag2411: '2.4.11',
  wcag2412: '2.4.12', wcag2413: '2.4.13', wcag251: '2.5.1', wcag252: '2.5.2',
  wcag253: '2.5.3', wcag254: '2.5.4', wcag255: '2.5.5', wcag256: '2.5.6',
  wcag257: '2.5.7', wcag258: '2.5.8',
  // ─ Understandable ─
  wcag311: '3.1.1', wcag312: '3.1.2', wcag313: '3.1.3', wcag314: '3.1.4',
  wcag315: '3.1.5', wcag316: '3.1.6', wcag321: '3.2.1', wcag322: '3.2.2',
  wcag323: '3.2.3', wcag324: '3.2.4', wcag325: '3.2.5', wcag326: '3.2.6',
  wcag331: '3.3.1', wcag332: '3.3.2', wcag333: '3.3.3', wcag334: '3.3.4',
  wcag335: '3.3.5', wcag336: '3.3.6', wcag337: '3.3.7', wcag338: '3.3.8',
  wcag339: '3.3.9',
  // ─ Robust ─
  wcag411: '4.1.1', wcag412: '4.1.2', wcag413: '4.1.3',
};

function mapAxeTagsToCriterion(tags) {
  if (!tags || !Array.isArray(tags)) return 'N/A';
  for (const tag of tags) {
    const m = WCAG_TAG_TO_CRITERION[tag];
    if (m) return m;
  }
  return 'N/A';
}

/**
 * Compute compliance score from violations and passes
 */
function computeScore(violations, passes) {
  let critical = 0, serious = 0, moderate = 0, minor = 0;
  
  violations.forEach(v => {
    const n = Math.max(1, v.nodeCount || 1);
    if (v.impact === 'critical') critical += n;
    else if (v.impact === 'serious') serious += n;
    else if (v.impact === 'moderate') moderate += n;
    else minor += n;
  });
  
  const failPoints = 
    Math.min(critical, 50) * 10 +
    Math.min(serious, 80) * 6 +
    Math.min(moderate, 100) * 3 +
    Math.min(minor, 200) * 1;
  
  const passPoints = passes * 2;
  const totalPoints = passPoints + failPoints + 100;
  const ratio = (passPoints + 100) / totalPoints;
  const score = Math.round(ratio * 100);
  
  return {
    score: Math.max(18, Math.min(100, score)),
    critical,
    serious,
    moderate,
    minor,
    totalViolations: critical + serious + moderate + minor,
  };
}

/**
 * Scan a single page and return results
 */
async function scanPage(browser, url, wcagVersion, wcagLevel) {
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setBypassCSP(true);
    
    // Navigate to page
    try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    } catch (navErr) {
      if (navErr.message.includes('timeout')) {
        console.warn(`Navigation timeout for ${url}, continuing with partial load`);
      } else {
        throw navErr;
      }
    }
    
    // Wait for DOM to stabilize
    await new Promise(r => setTimeout(r, 1000));
    
    // Run axe-core scan
    const axeResults = await runAxeScan(page, wcagVersion);
    
    // Compute score
    const { score, critical, serious, moderate, minor, totalViolations } = 
      computeScore(axeResults.violations, axeResults.passes);
    
    return {
      url,
      score,
      violations: axeResults.violations,
      passes: axeResults.passes,
      critical,
      serious,
      moderate,
      minor,
      totalViolations,
    };
  } finally {
    await page.close();
  }
}

/**
 * Save scan results to database
 */
async function saveScanResult(scanId, result, batchId, userId, wcagLevel, wcagVersion) {
  // Update scan record
  const { error: scanError } = await supabase
    .from('scans')
    .update({
      status: 'completed',
      compliance_score: result.score,
      total_violations: result.totalViolations,
      critical_count: result.critical,
      serious_count: result.serious,
      moderate_count: result.moderate,
      minor_count: result.minor,
      wcag_level: wcagLevel,
      wcag_version: wcagVersion,
      pages_scanned: 1,
      completed_at: new Date().toISOString(),
    })
    .eq('id', scanId);
  
  if (scanError) {
    console.error(`Failed to update scan ${scanId}:`, scanError);
    throw scanError;
  }
  
  // Insert violations
  if (result.violations.length > 0) {
    const violationsToInsert = result.violations.map((v, i) => ({
      scan_id: scanId,
      rule_id: v.id,
      rule_description: v.description?.slice(0, 500) || v.help?.slice(0, 500) || '',
      impact: v.impact,
      wcag_criterion: mapAxeTagsToCriterion(v.tags),
      wcag_level: wcagLevel,
      page_url: result.url,
      element_html: v.nodes?.[0]?.html?.slice(0, 1000) || '',
      element_selector: v.nodes?.[0]?.target?.join(' ')?.slice(0, 500) || '',
      node_count: v.nodeCount || 1,
      tags: v.tags || [],
      fix_summary: v.help?.slice(0, 500) || '',
      fix_detail: v.description?.slice(0, 2000) || '',
      help_url: v.helpUrl || '',
      sort_order: i,
    }));
    
    const { error: violationsError } = await supabase
      .from('violations')
      .insert(violationsToInsert);
    
    if (violationsError) {
      console.error(`Failed to insert violations for ${scanId}:`, violationsError);
    }
  }
  
  // Create report
  const { error: reportError } = await supabase
    .from('reports')
    .insert({
      scan_id: scanId,
      user_id: userId,
      name: `Multi-scan of ${result.url} - ${new Date().toLocaleDateString()}`,
      is_public: false,
    });
  
  if (reportError) {
    console.error(`Failed to create report for ${scanId}:`, reportError);
  }
}

/**
 * Update batch progress
 */
async function updateBatchProgress(batchId, completed, failed) {
  // Get current batch state
  const { data: batch } = await supabase
    .from('batch_scans')
    .select('completed_urls, failed_urls, total_urls')
    .eq('id', batchId)
    .single();
  
  if (!batch) {
    console.error(`Batch ${batchId} not found`);
    return;
  }
  
  const newCompleted = (batch.completed_urls || 0) + completed;
  const newFailed = (batch.failed_urls || 0) + failed;
  const allDone = newCompleted + newFailed >= batch.total_urls;
  
  const { error } = await supabase
    .from('batch_scans')
    .update({
      completed_urls: newCompleted,
      failed_urls: newFailed,
      status: allDone ? (newFailed === batch.total_urls ? 'failed' : 'completed') : 'running',
      completed_at: allDone ? new Date().toISOString() : null,
    })
    .eq('id', batchId);
  
  if (error) {
    console.error(`Failed to update batch ${batchId}:`, error);
  }
}

/**
 * Notify Vercel API that multiscan is complete
 */
async function notifyVercel(batchId) {
  try {
    const response = await fetch(`${APP_URL}/api/scan/multiscan/callback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
      body: JSON.stringify({ batchId }),
    });
    
    if (!response.ok) {
      console.error(`Failed to notify Vercel: ${response.status}`);
    }
  } catch (err) {
    console.error('Failed to notify Vercel:', err.message);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('=== Multi-Page Scanner ===');
  console.log(`Batch ID: ${batchId}`);
  console.log(`User ID: ${userId}`);
  console.log(`Base URL: ${baseUrl}`);
  console.log(`Page Count: ${pageCount}`);
  console.log(`WCAG Version: ${wcagVersion}`);
  console.log(`WCAG Level: ${wcagLevel}`);
  
  // Update batch status to running
  await supabase
    .from('batch_scans')
    .update({ status: 'running' })
    .eq('id', batchId);
  
  let browser;
  try {
    // Launch browser
    const chromiumPath = await getChromiumPath();
    console.log(`Using Chromium: ${chromiumPath}`);
    
    browser = await puppeteer.launch({
      executablePath: chromiumPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    
    // Discover links from base URL
    console.log('Discovering pages...');
    const page = await browser.newPage();
    const urls = await discoverLinks(page, baseUrl, pageCount);
    await page.close();
    
    console.log(`Found ${urls.length} pages to scan`);
    
    // Create scan records for each URL
    const scanRecords = [];
    for (let i = 0; i < urls.length; i++) {
      const { data: scan, error } = await supabase
        .from('scans')
        .insert({
          batch_id: batchId,
          user_id: userId,
          url: urls[i],
          status: 'queued',
          queue_position: i,
          pages_requested: 1,
          wcag_level: wcagLevel,
          wcag_version: wcagVersion,
        })
        .select('id')
        .single();
      
      if (error) {
        console.error(`Failed to create scan record for ${urls[i]}:`, error);
        continue;
      }
      
      scanRecords.push({ id: scan.id, url: urls[i] });
    }
    
    // Update total_urls to actual count
    await supabase
      .from('batch_scans')
      .update({ total_urls: scanRecords.length })
      .eq('id', batchId);
    
    // Scan each page
    let completedCount = 0;
    let failedCount = 0;
    
    for (const scanRecord of scanRecords) {
      console.log(`Scanning: ${scanRecord.url}`);
      
      // Update scan status to running
      await supabase
        .from('scans')
        .update({
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .eq('id', scanRecord.id);
      
      try {
        const result = await scanPage(browser, scanRecord.url, wcagVersion, wcagLevel);        // Save results
        await saveScanResult(
          scanRecord.id,
          result,
          batchId,
          userId,
          wcagLevel,
          wcagVersion
        );

        // Step 10: reconcile violation_status cross-scan for this URL.
        try {
          await reconcileStatusForWorker(
            userId,
            scanRecord.id,
            scanRecord.url,
            (result.violations || []).map((v) => ({
              rule_id: v.id,
              page_url: scanRecord.url,
              element_html: v.nodes?.[0]?.html || '',
            })),
          );
        } catch (statusErr) {
          console.error(`[WORKER] reconcileStatus failed for ${scanRecord.url}:`, statusErr.message);
        }

        scanRecord._success = true;
        completedCount++;
        console.log(`✓ Completed: ${scanRecord.url} (Score: ${result.score})`);
      } catch (err) {
        console.error(`✗ Failed: ${scanRecord.url} - ${err.message}`);
        scanRecord._success = false;
        
        // Mark scan as failed
        await supabase
          .from('scans')
          .update({
            status: 'failed',
            error_message: err.message?.slice(0, 500) || 'Scan failed',
            completed_at: new Date().toISOString(),
          })
          .eq('id', scanRecord.id);

        // Step 8: refund the single page-render reserved for this URL so
        // a partial-batch failure doesn't lock the user's render quota.
        await refundPageRenderOnFailure(userId, scanRecord.id, 'engine_failure');

        failedCount++;
      }
      
      // Update batch progress (pass delta, not cumulative)
      // result is only in scope if the try succeeded
      await updateBatchProgress(batchId, scanRecord._success ? 1 : 0, scanRecord._success ? 0 : 1);
    }
    
    console.log(`\n=== Scan Complete ===`);
    console.log(`Completed: ${completedCount}`);
    console.log(`Failed: ${failedCount}`);
    
  } catch (err) {
    console.error('Fatal error:', err);
    
    // Mark batch as failed
    await supabase
      .from('batch_scans')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', batchId);
    
    // Mark all remaining queued scans as failed
    await supabase
      .from('scans')
      .update({
        status: 'failed',
        error_message: 'Batch scanning aborted due to fatal error',
        completed_at: new Date().toISOString(),
      })
      .eq('batch_id', batchId)
      .in('status', ['queued', 'running']);
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
  
  // Notify Vercel
  await notifyVercel(batchId);
  
  console.log('Done!');
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});
