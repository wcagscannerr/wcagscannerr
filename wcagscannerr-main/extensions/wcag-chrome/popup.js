// ============================================================
// Step 12 — Chrome extension popup script
// ============================================================
// Flow:
//  1. On open: read the active tab's URL and preview it.
//  2. On click: send { type: 'wcagscan:run' } to the content script in
//     the active tab; await the result back; render.
//  3. Build a CTA back to the hosted free-scan flow with the URL
//     pre-filled so the user can pivot from the popup into the full
//     server-side pipeline (capture lead + unlock VPAT-grade detail).
//
// Tag set + scoring logic mirror lib/scanner/engine.ts. The numbers
// won't be byte-equal (no `nodeCount` weighting in client axe output
// vs. post-process summary), but the bucket boundaries match.

(() => {
  'use strict';

  const HOSTED_APP = 'https://wcagscannerr.com';

  // Mirror lib/scanner/engine.ts runOnlyTags + settings: 2.1 AA + best-practice.
  const RUN_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'];

  /** Same scoring shape as the main engine (capped deny-points vs.
   *  pass-points + 100 baseline). See lib/scanner/engine.ts. */
  function computeScore(violations, passes) {
    let critical = 0, serious = 0, moderate = 0, minor = 0;
    for (const v of violations) {
      const n = Math.max(1, v.nodes?.length || 1);
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
    const passPoints = (passes || 0) * 2;
    const total = passPoints + failPoints + 100;
    const ratio = (passPoints + 100) / total;
    const score = Math.round(ratio * 100);
    return {
      score: Math.max(18, Math.min(100, score)),
      critical, serious, moderate, minor,
      total: critical + serious + moderate + minor,
    };
  }

  function scoreColor(score) {
    if (score >= 75) return '#22c55e';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  function show(id) {
    for (const el of ['results', 'placeholder', 'error-pane', 'cta']) {
      document.getElementById(el)?.classList.toggle('hidden', el !== id);
    }
  }

  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async function render() {
    const tab = await getActiveTab();
    const urlEl = document.getElementById('url-display');
    if (urlEl) {
      try {
        const u = new URL(tab?.url || '');
        urlEl.textContent = u.host + u.pathname;
      } catch {
        urlEl.textContent = tab?.url || '(no URL)';
      }
    }
    // Page URL unavailable (chrome:// pages etc.).
    if (!tab?.url || !/^https?:/.test(tab.url)) {
      document.getElementById('scan-btn').disabled = true;
      show('placeholder');
      document.getElementById('placeholder').querySelector('p').textContent =
        'This page doesn\'t allow scanning (browser or system page).';
      return;
    }
    // Once a scan has been run this session, surface the results pane.
    const stored = await chrome.storage.session.get('lastResult');
    if (stored?.lastResult && stored.lastResult.url === tab.url) {
      renderResult(stored.lastResult);
    } else {
      show('placeholder');
    }
  }

  function renderResult(result) {
    show('results');
    document.getElementById('cta').classList.remove('hidden');

    const scoreEl = document.getElementById('score-num');
    scoreEl.textContent = String(result.score);
    scoreEl.style.color = scoreColor(result.score);
    document.getElementById('score-label').textContent =
      result.score >= 75 ? 'Excellent' : result.score >= 50 ? 'Needs work' : 'Critical gaps';

    document.getElementById('t-critical').textContent = result.counts.critical;
    document.getElementById('t-serious').textContent = result.counts.serious;
    document.getElementById('t-moderate').textContent = result.counts.moderate;
    document.getElementById('t-minor').textContent = result.counts.minor;

    const olEl = document.getElementById('violation-list');
    olEl.innerHTML = '';
    for (const v of result.topViolations) {
      const li = document.createElement('li');
      const html = stripTags(v.description);
      const html2 = stripTags(v.help);
      if (html != null) li.textContent = html;
      else if (html2 != null) li.textContent = html2;
      else li.textContent = 'No description available.';
      li.className = 'violation-item ' + (v.impact || 'minor');
      // Prefix a badge span so it's clear which impact bucket.
      const badge = document.createElement('span');
      badge.className = 'badge ' + (v.impact || 'minor');
      badge.textContent = (v.impact || 'minor').toUpperCase();
      li.prepend(badge);
      olEl.appendChild(li);
    }

    const cta = document.getElementById('cta-link');
    cta.href = `${HOSTED_APP}/free-scan?url=${encodeURIComponent(result.url)}`;
    cta.textContent = 'See full report on wcagscannerr.com →';
  }

  function stripTags(s) {
    if (!s) return null;
    return s.replace(/<[^>]+>/g, '').slice(0, 140);
  }

  async function runScan() {
    const btn = document.getElementById('scan-btn');
    btn.disabled = true;
    btn.textContent = 'Scanning…';
    show('placeholder');
    try {
      const tab = await getActiveTab();
      if (!tab?.id) throw new Error('No active tab.');
      // Ask the content script to load axe-core (already bundled with
      // the extension via web_accessible_resources pattern below) and
      // run a scan, returning a JSON-serializable summary.
      const response = await chrome.tabs.sendMessage(tab.id, {
        type: 'wcagscan:run',
        tags: RUN_TAGS,
      });
      if (!response || !response.ok) {
        throw new Error(response?.error || 'Scan failed silently.');
      }
      const counts = computeScore([], 0); // placeholder; filled below
      const computed = computeScore(response.violations || [], response.passes || 0);
      const result = {
        url: tab.url,
        score: computed.score,
        counts: {
          critical: computed.critical,
          serious: computed.serious,
          moderate: computed.moderate,
          minor: computed.minor,
        },
        // Top violations sorted by impact, then by node count.
        topViolations: (response.violations || [])
          .sort((a, b) => {
            const order = { critical: 4, serious: 3, moderate: 2, minor: 1, undefined: 0 };
            const diff = (order[b.impact] || 0) - (order[a.impact] || 0);
            if (diff) return diff;
            return (b.nodes?.length || 1) - (a.nodes?.length || 1);
          })
          .slice(0, 5),
      };
      await chrome.storage.session.set({ lastResult: result });
      renderResult(result);
    } catch (err) {
      const msg = err?.message || String(err);
      show('error-pane');
      document.getElementById('error-msg').textContent = msg;
    } finally {
      btn.disabled = false;
      btn.textContent = 'Scan page';
    }
  }

  document.getElementById('scan-btn').addEventListener('click', runScan);
  render();
})();
