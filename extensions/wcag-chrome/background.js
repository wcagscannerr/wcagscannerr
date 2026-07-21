// =============================================================
// Step 12 — Manifest V3 service worker
// =============================================================
// The MVP flow is popup ↔ content_script directly via chrome.tabs
// .sendMessage, so the service worker is intentionally minimal.
// It still needs to exist (MV3 requires one to be declared); we
// hang a couple of lifecycles hooks + an install-time nudge.

self.addEventListener('install', () => {
  // Skip waiting so the SW activates immediately on first install,
  // avoiding the ~30s delay that otherwise delays the first scan after
  // the user loads the unpacked extension.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
