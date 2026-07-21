# WCAG Scanner — Chrome Extension (MVP)

A single-page axe-core scanner for the active tab that deep-links
into the hosted `free-scan` flow on [wcagscannerr.com](https://wcagscannerr.com).
This is **the top-of-funnel acquisition surface** — same pattern
WAVE and Silktide use.

> Preview build, not on the Chrome Web Store yet. The README ends
> with a checklist for the public release.

## Install (Chrome 88+, Edge 88+, Firefox 109+)

1. **Get axe-core vendored.** Either:
   - `npm install axe-core@4.10.3` then copy `node_modules/axe-core/axe.min.js` to this directory, **or**
   - download from <https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js> and place at `extensions/wcag-chrome/axe.min.js`.

   File size is ~540 KB. Do NOT commit this to the public repo —
   add `extensions/wcag-chrome/axe.min.js` to `.gitignore`.

2. **Add icons** (currently just placeholders). Drop three PNGs at:
   - `icons/icon-16.png`
   - `icons/icon-48.png`
   - `icons/icon-128.png`

   A quick PDF→PNG export from the WCAG Scanner logo works.

3. **Load unpacked:**
   - Navigate to `chrome://extensions`.
   - Toggle "Developer mode" on (top-right).
   - Click "Load unpacked" and select this directory (`extensions/wcag-chrome/`).
   - Pin the WCAG Scanner icon to the toolbar.

4. **Use it:**
   - Visit any public HTTP(S) URL.
   - Click the WCAG Scanner icon.
   - Click **Scan page** — a 1-3 second wait while axe-core runs client-side.
   - See the score + impact counts + top 5 violations.
   - Click **See full report on wcagscannerr.com** — the URL is passed to the hosted free-scan flow as a `?url=` query string.

## How it works

```
+--------------------+   sendMessage   +---------------------+
| Popup (popup.js)   |  ─────────────► | Content Script       |
| - reads tab URL    |                 | (content.js)         |
| - renders score    |                 | - loads axe-core     |
| - builds CTA       |  ◄───────────── | - runs axe.run(...)  |
| -16× score pill    |   response      | - returns summary    |
+----------+---------+                 +---------------------+
           │
           │  window.open / window.location.href
           ▼
   ┌────────────────────────────────────┐
   │  https://wcagscannerr.com/free-scan?url=<encoded>  │
   │  → app/free-scan/page.tsx reads ?url=   │
   │    (pre-fills the URL input, valid  │
   │    against new URL(...) before      │
   │    accepting to prevent injection) │
   └────────────────────────────────────┘
```

## Permissions

| Permission                                       | Why                                       |
| ------------------------------------------------ | ----------------------------------------- |
| `activeTab`                                      | Query the active tab to read its URL.     |
| `storage`                                        | Persist last scan result for the session.|
| `host_permissions: <all_urls>`                   | Inject the content script on any page.   |

No remote eval, no `tabs.executeScript`, no `webRequest`-level
tracking. The extension never reads page content outside of what axe-core inspects.

## Tag selection

The popup runs axe with the same tag set the engine uses for
WCAG 2.1 AA scans in the web app:

```js
['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
```

This is the SPEC-level audit set — adding/removing tags here MUST
be coordinated with `lib/scanner/engine.ts` to preserve parity.

## Scoring

Mirrors `lib/scanner/engine.ts` `computeScore` — capped fail-points
(critical×10, serious×6, moderate×3, minor×1, each with an instance cap)
divided by pass-points×2 + 100 baseline, scored 18..100.

Drift is acceptable for v1 (no `nodeCount` weighting from the server
engine's normalization), but a feature parity audit should happen
before any public release.

## Files

```
extensions/wcag-chrome/
├── README.md            (this file)
├── manifest.json        (Manifest V3)
├── popup.html           (popup shell)
├── popup.css            (popup styles)
├── popup.js             (popup controller)
├── content.js           (loads axe-core + runs axe.run in the active tab)
├── background.js        (service worker — minimal for MVP)
├── axe.min.js           (vendored axe-core 4.10.3 — do NOT commit)
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

## Web Store checklist (before public release)

- [ ] Replace placeholder icons with branded artwork.
- [ ] Add a privacy-policy URL (required for `<all_urls>`).
- [ ] Sign the package per Chromium's MV3 requirements.
- [ ] Ship a "what's new" tab on the popup for the v0.2 release.
- [ ] Wire analytics (privacy-respecting — no third-party trackers).
- [ ] Capture lead email on the CTA click before navigating to free-scan.
