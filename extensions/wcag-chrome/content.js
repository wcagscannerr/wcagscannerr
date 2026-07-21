// =============================================================
// Step 12 — Content script: load axe-core and run a one-page scan
// =============================================================
// Receives { type: 'wcagscan:run', tags: [...] } from the popup,
// loads axe-core if not already present, runs axe.run() with the
// requested tag set, and posts the result back.
//
// CSP note: Manifest V3 forbids remote script eval/chrome.runtime
// .executeScript with arbitrary code, so we rely on a vendored copy
// of axe.min.js shipped alongside this script in the extension
// package's root. See extensions/wcag-chrome/README.md for build
// instructions.

(() => {
  'use strict';

  let axeLoadPromise = null;

  function loadAxe() {
    if (window.axe) return Promise.resolve(window.axe);
    if (axeLoadPromise) return axeLoadPromise;
    axeLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('axe.min.js');
      s.onload = () => {
        if (window.axe) resolve(window.axe);
        else reject(new Error('axe.min.js loaded but window.axe is missing — wrong bundle?'));
      };
      s.onerror = () => reject(new Error('Failed to load vendored axe.min.js from extension bundle.'));
      (document.head || document.documentElement).appendChild(s);
    });
    return axeLoadPromise;
  }

  function runAxe(tags) {
    return new Promise((resolve, reject) => {
      if (!window.axe) return reject(new Error('axe-core not loaded.'));
      window.axe.run(
        document,
        { runOnly: { type: 'tag', values: tags } },
        (err, results) => {
          if (err) return reject(err);
          // Trim results to a serializable summary; the full DOM
          // payload is several MB and not useful in the popup.
          const summary = {
            url: results.url,
            passes: results.passes?.length || 0,
            violations: (results.violations || []).map((v) => ({
              id: v.id,
              impact: v.impact,
              description: v.description,
              help: v.help,
              tags: v.tags,
              nodes: v.nodes?.map((n) => ({
                target: n.target,
                html: (n.html || '').slice(0, 300),
              })) || [],
              nodeCount: v.nodes?.length || 1,
            })),
            incomplete: (results.incomplete || []).map((v) => ({
              id: v.id,
              impact: v.impact,
            })),
          };
          resolve(summary);
        },
      );
    });
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'wcagscan:run') return false;
    (async () => {
      try {
        const axe = await loadAxe();
        const summary = await runAxe(message.tags || []);
        sendResponse({ ok: true, ...summary });
      } catch (err) {
        sendResponse({ ok: false, error: err?.message || String(err) });
      }
    })();
    return true; // keeps the channel open for async sendResponse.
  });
})();
