# WCAG Scanner — Setup, Architecture, and Feature Audit

> **What this document is** — a single source of truth for taking the
> `wcagscannerr` codebase from "working tree" to "running production SaaS."
> It records what was built, what runtime services must be provisioned,
> and which steps (Dodo product setup, public GitHub Action repo, axe-CDN
> pinning, etc.) still require **human action** before a paying customer
> can transact.
>
> **Pre-launch posture** — no live paying customers yet, so the migration
> sequence and pricing structure can be re-shipped without grandfather
> shims, but every env var must be present in production before the
> first scan can complete a real checkout.

---

## 1. Project Snapshot

| Item | Value |
|------|-------|
| **Name** | WCAG Scanner (Automated Accessibility Compliance Audits) |
| **Repo** | `vaibhavdobhall/wcagscannerr` (private main app) |
| **Live demo** | https://www.wcagscannerr.com |
| **Framework** | Next.js 14 (App Router) |
| **Language** | TypeScript 5.7 |
| **Database** | Supabase Postgres + Storage |
| **Auth** | Supabase Auth (email + Google OAuth) |
| **Payments** | Dodo Payments |
| **Email** | Resend |
| **AI** | DeepSeek (primary), Anthropic Claude (fallback) |
| **Browser engine** | Puppeteer + `@sparticuz/chromium-min` (Vercel-side); `puppeteer` (standalone GitHub Actions worker) |
| **Testing engine** | axe-core 4.10.3 (loaded from cdnjs at runtime) |
| **Hosting** | Vercel (Hobby or Pro) |
| **Cron** | GitHub Actions workflows (NOT Vercel cron — runs every 15 min) |

License: MIT (see `LICENSE`).

---

## 2. How the System Actually Works

### 2.1 User-facing flows

```
                  ┌─────────────────────────────────────────────┐
   anonymous ──► │  /free-scan        (3 free, no signup)        │
                  │  /contrast-checker (manual color picker)     │
                  │  /sample-report    (demo data, no scan)      │
                  │  /demand-letter    (lawsuit risk primer)     │
                  │  /statement-generator                        │
                  └─────────────────────────────────────────────┘

   authed ─────► /dashboard     (quota, recent scans, leads)
                /scanner        (single-page scan)
                /batch          (multi-URL batch scan, async)
                /reports        (PDF / CSV / Statement / Share)
                /monitoring     (weekly/daily recurring scans)
                /vpat           (ACR / VPAT generation, Enterprise+)
                /billing        (Dodo checkout + portal + cancel)
                /agency         (Growth+ cross-client view)
                /api-keys       (Enterprise-only CI/CD key mgmt)
                /settings       (profile + workspace)
```

### 2.2 Scan lifecycle (single page)

1. User submits a URL via `/scanner` → `app/api/scan/route.ts`.
2. **`lib/security/validateUrl.ts` (Step 7)** — DNS-aware SSRF guard
   resolves the hostname to its real IP(s) and rejects anything in
   the RFC 1918 / loopback / cloud-metadata / CGNAT / benchmark /
   multicast ranges (IPv4 + IPv6). Unresolvable hostnames are also
   rejected (no implicit "treat as safe").
3. **`lib/scanner/engine.ts`** — launches Puppeteer with
   `@sparticuz/chromium-min`, navigates with a 15-s soft timeout that
   falls back to "partial load," dismisses consent banners, loads
   axe-core 4.10.3 from cdnjs via `addScriptTag`, and runs
   `axe.run()` against WCAG 2.1 + best-practice tags (or 2.2 + 2.1 +
   best-practice when the WCAG-version UI toggle is set to 2.2).
4. **Responsive scans** (when `useResponsive: true`) re-run axe in
   mobile / tablet / desktop viewports, merge per-violation key by
   `rule_id || target || frame_source`, and return viewportBreakdown.
   Slow desktop sites auto-skip mobile/tablet viewports.
5. **`lib/scanner/scoring.ts`** (out of scope, do not edit) — exponential
   decay model that scores 0–100 with a floor of 18 so a single massive
   failure cluster doesn't zero-crush the score.
6. **Compliance assistant** (`components/chat/ComplianceAssistant.tsx`)
   uses DeepSeek + the injected scan context as a chat layer.
7. Each violation row is written to the PostgREST `violations` table
   with `page_url`, `rule_id`, `element_html`, `element_selector`,
   `wcag_criterion` (populated via `lib/vpat/wcagCriteria.ts` — Step 6).

### 2.3 Multi-page scan lifecycle (Step 1 — partial)

> **Status note:** the `lib/scanner/crawler.ts` module (Step 1's
> recursive BFS + sitemap-aware page discovery) was designed but **is
> NOT yet on disk** (the audit showed it is missing). Calling code in
> `scripts/multiscan-worker.mjs` and the multiscan / batch API routes
> still uses the old single-hop `discoverLinks`. **This is the
> largest unfinished item in the audit — see Human Action §5.**

How it will work once shipped:
1. Try `${origin}/sitemap.xml` (also parse `/robots.txt` for the
   `Sitemap:` directive — the Bashers honor it).
2. BFS crawl from the seed URL up to `maxDepth` (default 3),
   normalizing `<a href>` results (strip hash, trailing slash,
   tracking params), dedup'd via a Set.
3. Honors `robots.txt` `Disallow:` rules for the crawler's own UA.
4. Per-page fetch budget (15 s) so one slow page doesn't stall the
   whole crawl — same timeout-resilience pattern engine.ts already uses.
5. Caps at `maxPages` from the user's plan limit
   (`multiscanPageCap` — Step 2 field; `1 / 15 / 25 / 50` per tier).

### 2.4 Quota / credit system (Steps 4 + 8)

`scan_credits_ledger` is an **append-only ledger** of
`{ user_id, metric ('scan'/'page_render'), delta, reason, metadata }`.

```
   reason           what it means                                 delta sign
   ─────────────────────────────────────────────────────────────────────────────
   monthly_grant    +scansPerMonth OR +pageRendersPerMonth        positive
   scan_consumed    user submitted a scan / batch / api call      negative
   scan_failed_refund  refund because of OUR-side failure         positive
   manual_adjustment  support team adjustment                    +/- either
   overage_pending  audit row (delta=0) — user tried to exceed     zero
                    the page-render hard cap
```

**Reads are safe under concurrent writes** because `SUM(delta)` over
the period is lock-free under Postgres READ COMMITTED — no race window
between the cron tick (batch path) and a direct API scan.

Both metrics are bounded independently:
- `scansPerMonth` per tier — total monthly scan quota.
- `pageRendersPerMonth` per tier — bound on compute-cost tail.
  (`1 / 120 / 600 / 2,500` for free / starter / growth / enterprise).
  Single-page scan = 1 render; responsive scan = 3 renders;
  multiscan/batch = N renders at reservation time.

**Refund rules (deterministic classification — not string match):**
- `engine_failure` → full refund (your Chromium crashed)
- `target_unreachable` → full refund, BUT a hard daily cap of
  **5 refunds per day per user per metric** so attackers can't farm
  credits by repeatedly scanning a known-dead URL.
- `invalid_target` → **no refund** (e.g. URL failed `isUrlSafe` —
  that's the user probing a forbidden URL, not scanner failure).

### 2.5 Public API + CI/CD (Step 5 partial)

Public Bearer-token API at `/api/v1/*`:
- `POST /api/v1/scan` — gated to `Enterprise` only via
  `apiAccess: true` in the plan object. Returns HTTP 400 when score
  is below `fail_threshold`, which means CI/CD pipelines get a
  non-zero exit code naturally.
- `GET/POST/DELETE /api/v1/keys` — key issuance/refund Middleware
  refuses to issue a working key to a non-Enterprise account.

A **separate public GitHub Action repo** (not the main app repo —
the main repo stays private) wraps the call:
- Inputs: `url`, `fail_threshold`, `api-key`
- Source: `github-action/action.yml`, `github-action/run-scan.js`,
  `github-action/README.md`
- Runner minutes are billed to the caller — zero infra cost to us.
- **The public repo must NOT be created yet — see Human Action §3.**

### 2.6 Chrome extension (Step 12 — shipped tree, untested in Chrome)

`extensions/wcag-chrome/` is a Manifest V3 extension:
- `manifest.json` — service worker + popup + content script
- `popup.{html,js,css}` — score + top-N violations + "See full report"
  CTA → `chrome.tabs.create(wcagscannerr.com/free-scan?url=ENCODED_URL)`
- `content.js` — injects axe in active tab and posts results
- `background.js` — handles the CTA handoff

`app/free-scan/page.tsx` was patched to read `?url=` and pre-fill
the scan form. **Manual smoke-test still required in real Chrome —
see Human Action §4.**

---

## 3. Pricing Tiers (Step 2 — SHIPPED)

| Tier       | Price        | Scans /mo | Page renders /mo | Multiscan cap | Monitored sites | API + CI/CD | White-label | VPAT |
|------------|--------------|-----------|------------------|---------------|-----------------|-------------|-------------|------|
| Free       | $0           | 3         | 3                | 1             | 0               | No          | No          | No   |
| Starter    | $29/mo       | 75        | 120              | 15            | 5               | No          | No          | No   |
| **Growth** | **$89/mo**   | 250       | 600              | 25            | 15              | No          | Yes         | Yes  |
| Enterprise | $175/mo      | 500       | 2,500 + overage  | 50            | 25              | **Yes**     | Yes         | Yes  |

- Growth carries the "Most Popular" badge (white-label + VPAT is the
  highest-intent offer).
- Two distinct caps per tier:
  `scansPerMonth` (total) and `pageRendersPerMonth` (compute-cost tail).
- **Critical:** `apiAccess: true` only on Enterprise. `/api/v1/scan`
  and `/api/v1/keys` key off this flag and reject non-Enterprise callers.
- No grandfathering needed (no live paying customers yet).

---

## 4. Feature Ship Status (audit)

| Step | Feature                                  | Status          | Notes |
|------|------------------------------------------|-----------------|-------|
| 1    | Real recursive crawler                   | **NOT SHIPPED** | `lib/scanner/crawler.ts` is missing. `discoverLinks` still single-hop. |
| 2    | Starter / Growth / Enterprise pricing    | SHIPPED         | `lib/dodo/plans.ts` rewritten; pricing UI updated; placeholder Dodo product IDs flow from env. |
| 3    | API / CI/CD gated to Enterprise          | SHIPPED         | `/api/v1/scan` + `/api/v1/keys` + `/settings/api-keys` enforce `apiAccess`. |
| 4    | Scan-failure refund / credit ledger     | SHIPPED         | `scan_credits_ledger` table (migration 015); `lib/scanner/credits.ts`; classification is deterministic (`engine_failure` / `target_unreachable` / `invalid_target`); 5/day `target_unreachable` cap. |
| 5    | CI/CD GitHub Action + usage stats        | **PARTIAL**     | Action scaffold + key-usage UI added. **Public GitHub repo still needed — see Human Action §3.** |
| 6    | Dependency / infra cleanup               | SHIPPED         | `chrome-aws-lambda` removed; `wcag_criterion` populated via `lib/vpat/wcagCriteria.ts`. |
| 7    | SSRF / DNS-aware URL validation          | SHIPPED         | `lib/security/validateUrl.ts` resolves hostname and rejects RFC 1918 / loopback / cloud-metadata / CGNAT / IPv6 ULA / link-local. Residual DNS-rebinding window accepted (documented in the file). |
| 8    | Page-render cap (compute-cost tail)      | SHIPPED         | Migration 016 adds `metric` + `overage_pending` reason. 4 paid routes enforce. Cron monitoring also pays 1 render per scanned site. |
| 9    | Client sub-accounts / white-label portal | **NOT STARTED** | No migration 017 yet. Confirmed design choice: child-claim on parent's JWT (no `auth.users` row) + same-domain `/client-portal`. Multi-PR sequence planned but not committed. |
| 10   | Issue lifecycle tracking                 | SHIPPED         | Migration 018 + `lib/scanner/statusTracker.ts` + `POST/GET /api/violations/status` + status UI in `components/scanner/ViolationCard.tsx` + reconcileStatus wired into 5 scan-completion paths. |
| 11   | Contrast / color-blindness simulator     | SHIPPED         | `components/scanner/ContrastSimulator.tsx` — SVG `feColorMatrix` for protanopia / deuteranopia / tritanopia / achromatopsia. Renders inline in ViolationCard when `rule_id === 'color-contrast'`. |
| 12   | Chrome extension MVP                     | SHIPPED in tree | `extensions/wcag-chrome/` (manifest.json / popup.{html,js,css} / content.js / background.js / README.md). **Manual Chrome install + smoke-test still required — see Human Action §4.** |
| 13   | Homepage stat counter SSR fix            | SHIPPED         | `components/landing/SocialProof.tsx` — realtime values render in initial HTML, no `useState(0)` SSR flash. |

---

## 5. Environment Variables — Full Reference

> **Naming rule:** anything with `NEXT_PUBLIC_` is exposed to the
> browser bundle; everything else must stay server-side. Service-role
> keys (`SUPABASE_SERVICE_ROLE_KEY`, `DODO_PAYMENTS_API_KEY`,
> `DODO_PAYMENTS_WEBHOOK_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
> `DEEPSEEK_API_KEY`, `CRON_SECRET`) MUST never be exposed via
> `NEXT_PUBLIC_*` even by accident.
>
> **Where to set them:** local `.env.local` (gitignored), Vercel
> dashboard for production + preview, GitHub Actions secrets for
> worker workflows.

### 5.1 Supabase (required)

| Variable                           | Where used                                                                | Notes |
|------------------------------------|---------------------------------------------------------------------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL`         | every Supabase client (browser, middleware, server)                       | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`    | browser + middleware client                                               | Anon key — safe for browser (RLS is the gate) |
| `SUPABASE_SERVICE_ROLE_KEY`        | `lib/supabase/server.ts`, `app/api/dodo/webhook/route.ts`, edge functions | **NEVER NEXT_PUBLIC** — bypasses RLS |

### 5.2 Dodo Payments (required for billing)

| Variable                                       | Where used                                          | Notes |
|------------------------------------------------|-----------------------------------------------------|-------|
| `DODO_PAYMENTS_API_KEY`                        | `lib/dodo/client.ts`                                | Dodo API key |
| `DODO_PAYMENTS_WEBHOOK_KEY`                    | `app/api/dodo/webhook/route.ts` (HMAC signature)    | Webhook signing secret |
| `DODO_PAYMENTS_ENVIRONMENT`                    | `lib/dodo/client.ts`                                | `live_mode` or `test_mode` |
| `NEXT_PUBLIC_APP_URL`                          | checkout return URL + cron absolute URL building    | e.g. `https://www.wcagscannerr.com` |
| `DODO_STARTER_PRODUCT_ID`                      | `lib/dodo/plans.ts` (Starter tier)                  | **Create in Dodo dashboard first** |
| `DODO_STARTER_ANNUAL_PRODUCT_ID`               | `lib/dodo/plans.ts` (Starter annual)                | Same |
| `DODO_GROWTH_PRODUCT_ID`                       | `lib/dodo/plans.ts` (Growth tier)                   | Same |
| `DODO_GROWTH_ANNUAL_PRODUCT_ID`                | `lib/dodo/plans.ts` (Growth annual)                 | Same |
| `DODO_ENTERPRISE_PRODUCT_ID`                   | `lib/dodo/plans.ts` (Enterprise tier)               | Same |
| `DODO_ENTERPRISE_ANNUAL_PRODUCT_ID`            | `lib/dodo/plans.ts` (Enterprise annual)             | Same |

### 5.3 Email (Resend)

| Variable           | Where used                                                | Notes |
|--------------------|-----------------------------------------------------------|-------|
| `RESEND_API_KEY`   | `lib/email/resend.ts` + cron routes that send reports     | resend.com API key |

### 5.4 AI

| Variable              | Where used                                                  | Notes |
|-----------------------|-------------------------------------------------------------|-------|
| `DEEPSEEK_API_KEY`    | `app/api/chat/route.ts`, `app/api/violations/[id]/ai-fix/route.ts` | DeepSeek key (default) |
| `ANTHROPIC_API_KEY`   | `app/api/violations/[id]/ai-fix/route.ts`                   | **Optional** — used as fallback when set. `useClaude = !!process.env.ANTHROPIC_API_KEY` |

### 5.5 Cron / GitHub Actions

| Variable                | Where used                                            | Notes |
|-------------------------|-------------------------------------------------------|-------|
| `CRON_SECRET`           | every `/api/cron/*` route + `scripts/multiscan-worker.mjs` + GH workflows | Long random string — **must match** across Vercel env AND GitHub secrets |
| `SUPABASE_URL`          | `scripts/multiscan-worker.mjs`                        | Same value as `NEXT_PUBLIC_SUPABASE_URL` (no NEXT_PUBLIC prefix because the worker is Node, not browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | `scripts/multiscan-worker.mjs`                    | Same as §5.1 |

### 5.6 GitHub Actions → hosted API (the multiscan worker workflow)

The worker workflows authenticate against the hosted API by mirroring
a subset of the env-var values from §5.1–§5.5 under **Settings →
Secrets and variables → Actions → New repository secret** on your
main app's repo. The exact set the multiscan worker reads at runtime:

```
  NEXT_PUBLIC_APP_URL     # used to build absolute URLs for callbacks
  CRON_SECRET             # must match the value in §5.5 verbatim, otherwise /api/cron/* 401s
  RESEND_API_KEY         # courtesy email notifications on monitoring scan completion
  SUPABASE_URL           # equivalent to NEXT_PUBLIC_SUPABASE_URL but for the Node-side worker (no NEXT_PUBLIC_ prefix because the worker never runs in a browser)
  SUPABASE_SERVICE_ROLE_KEY  # service-role key so the worker can write directly to the DB without going through PostgREST
  # NOTE: SUBSCRIBE_API_KEY and SUBSCRIBE_AUTH_TOKEN — DO NOT add. These were
  # speculative entries from an early draft and do not match any caller in the
  # codebase. If a future feature genuinely needs admin auth against the GH
  # API surface from the worker, add it under its own sub-section with the
  # source file path that consumes it.
```

### 5.7 GitHub dispatches from the multiscan route (worker trigger)

`app/api/scan/multiscan/route.ts` (lines 159–161) reads these from
the server env to dispatch a `repository_dispatch` event into the
standalone worker workflow (`.github/workflows/multiscan.yml` +
`scripts/multiscan-worker.mjs`). Required only when the multiscan
feature is exercised; ignore for a single-page-only deployment.

| Variable            | Source / scope                                   | Notes |
|---------------------|---------------------------------------------------|-------|
| `GITHUB_PAT`        | Vercel secret (server-side only)                  | Personal access token with `repo` scope. Falls back to `GITHUB_TOKEN` if unset. |
| `GITHUB_TOKEN`      | Same                                             | Fallback for `GITHUB_PAT` |
| `GITHUB_REPO_OWNER` | Vercel / GitHub Actions both                      | e.g. `vaibhavdobhall` |
| `GITHUB_REPO_NAME`  | Same                                             | e.g. `wcagscannerr` (must be the repo where `multiscan.yml` + `multiscan-worker.mjs` live) |

### 5.8 Public GitHub Action consumer-facing secrets

The consumer (your customer's CI pipeline, not you) sets:

```
  WCAG_API_KEY                # Bearer token from /settings/api-keys (Enterprise only)
  WCAG_FAIL_THRESHOLD         # default 85 if unset
  WCAG_SCAN_URL               # override scan target
  WCAG_API_BASE_URL           # default https://www.wcagscannerr.com
```

---

## 6. Setup — From Zero to Running

### 6.1 Prerequisites

- Node.js 18+ (Vercel deployment uses Node 20 — match locally with `nvm use 20`)
- A Supabase project (free tier is enough for development)
- A Dodo Payments account with API + webhook key
- A Resend account + verified sending domain
- A DeepSeek API key
- A GitHub account + repo (the main app repo stays **private**)
- A Vercel account (free Hobby tier is fine for initial deploy; Pro is
  needed if scan routes need >300s `maxDuration` — currently all routes
  are configured for the 300s ceiling but if you exceed the Vercel
  memory/time tiers you'll see a function-execution error in production)

### 6.2 First-time boot

```bash
git clone https://github.com/vaibhavdobhall/wcagscannerr.git
cd wcagscannerr
npm install
cp .env.example .env.local   # create one if it doesn't exist yet (see §5)
npm run dev
```

Verifies: opens `http://localhost:3000` and the marketing home page
should render correctly. The hero stat counters (Step 13) and
social-proof numbers (94.8% / 5,000+ / $1M) will render correctly
in initial HTML — no flash.

### 6.3 Database migrations

The current migration set is **23 files** in `supabase/migrations/` (the *next* migration is `017_client_accounts.sql` for Step 9, which is not yet authored):

```
001_initial_schema.sql              -- profiles, scans, violations, reports, monitored_sites, api_keys
002_free_scan_usage.sql
003_ai_fixes.sql
004_lawsuit_risk.sql
005_compliance_assistant.sql
006_rate_limits.sql
007_newsletter_subscribers.sql
008_wcag_version.sql
009_batch_scans.sql
010_violation_sort_order.sql
011_violation_node_count.sql
012_vpat_reports.sql
013_vpat_acr_pdf.sql
014_subscription_tiers_v2.sql       -- Step 2: starter/growth/enterprise
015_scan_credits_ledger.sql         -- Step 4: replace mutable counter with append-only ledger
016_page_render_ledger.sql          -- Step 8: page-render metric + monthly_grant backfill
017_client_accounts.sql             -- Step 9: NOT YET CREATED (auth/white-label sub-accounts PR #1; skip this when applying)
018_violation_status.sql            -- Step 10: issue-lifecycle cross-scan carry-forward
20250708000001_shared_reports.sql
20250708000002_monitoring_alerts.sql
20250708000002_monitoring_report_id.sql
20250708000003_api_keys.sql
20250719000001_multiscan.sql
20250719000002_monitoring_report_id.sql
```

Apply them in **date order** (NOT alphabetical — date-prefixed files like `20250708000003_api_keys.sql` precede the letter-prefixed ones they depend on, but a naive alpha-sort puts them in the right place too because `20250708` < `20250719` < `002`):

```bash
# Option A: Supabase CLI  (recommended — handles ordering correctly)
supabase db push

# Option B: Apply via Supabase Dashboard → SQL Editor (paste each file sequentially, skipping 017)

# Option C: Pipeline apply by numeric-then-date sort, skipping 017:
ls supabase/migrations/*.sql \
  | grep -v '017_client_accounts' \
  | sort \
  | xargs -n1 psql "$DATABASE_URL" -f
```

After applying, verify with:
```sql
SELECT * FROM scan_credits_ledger LIMIT 5;
SELECT * FROM violation_status LIMIT 5;
-- Confirm the 4 SQL ENUMs exist (credit_reason / ledger_metric / violation_status_type):
SELECT typname FROM pg_type WHERE typname IN
  ('credit_reason','ledger_metric','violation_status_type');
```

### 6.4 Deploy to Vercel

1. Connect the GitHub repo to Vercel (private repo works fine).
2. Configure **environment variables** from §5 above on Vercel
   (Production + Preview + Development).
3. Vercel auto-detects Next.js and uses the `vercel.json` config:
   all scan/multiscan/batch/monitoring/cron routes get
   `{ maxDuration: 300, memory: 2048 }`.
4. Cron jobs (Vercel cron scheduled twice daily at UTC 03:00 and 09:00):
   - `/api/cron/process-batch` — batch scan queue safety net.
   - `/api/cron/run-monitoring` — daily/weekly/monthly scheduled scans.
   **Note:** Vercel cron has minimum-frequency limits on Hobby tier
   (1/day). For more-frequent work (e.g. every-15-min monitoring
   tick) we use the GitHub Actions workflows (`process-batch-cron.yml`,
   `monitoring-cron.yml`, `multiscan.yml`) which have no such limits.

### 6.5 GitHub Actions setup

The three workflows live in `.github/workflows/`:

- `process-batch-cron.yml` — every 5 min, hits `/api/cron/process-batch`
  with `Authorization: Bearer $CRON_SECRET`
- `monitoring-cron.yml` — every 15 min, hits `/api/cron/run-monitoring`
  with the same auth
- `multiscan.yml` — runs `scripts/multiscan-worker.mjs` which
  orchestrates the deep multiscan using the recursive crawler (when
  shipped — see § 5 below for the current `discoverLinks` gap)

Set these **GitHub repo secrets** for the workflows to authenticate:
```
NEXT_PUBLIC_APP_URL
CRON_SECRET
RESEND_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

### 6.6 Public GitHub Action (Step 5 — NOT YET CREATED)

The customer-facing GitHub Action lives in `github-action/` (already
on disk):
- `action.yml` — action metadata
- `run-scan.js` — the JS entry point that calls `/api/v1/scan`
- `README.md` — consumer-facing install + usage

You still need to create the **public GitHub repo** that publishes
this Action. See **Human Action §3**.

---

## 7. Project Structure (key paths)

```
app/
  api/                  REST endpoints
    v1/scan/            Enterprise API (Bearer auth)
    v1/keys/            Enterprise API key mgmt
    cron/               time-triggered batch + monitoring jobs
    dodo/               checkout, webhook, cancel, portal
    scan, scan/multiscan, scan/batch, scan/activity
    monitoring/         dashboard-internal monitoring CRUD
    reports/[id]/       PDF, CSV, statement, share
    chat/               AI chatbot
    violations/[id]/ai-fix
  (auth)/               login, signup, forgot/reset password
  (dashboard)/          authenticated routes
  (legal)/              privacy, terms, refund, disclaimer
  free-scan/            anonymous scan (3 free)
  contrast-checker/     standalone color contrast tool
  demand-letter/        lawsuit preparedness
  statement-generator/  accessibility statement builder
  sample-report/        demo data preview

components/
  landing/              marketing sections (Hero, Pricing, Features, HowItWorks, SocialProof, ComparisonTable, FAQ).
                        ▸ After Step 13, SocialProof.tsx renders real numbers in initial HTML.
  scanner/              scan UI: ScanForm, ScanProgress, ScanResults, ViolationCard (with status controls + contrast simulator), ComplianceScore, BigSixSummary
                        ▸ Step 11: ContrastSimulator.tsx is colocated here.
  reports/              ReportDetail, ReportCard, ReportVisualSection, PDFExportButton, GenerateVpatButton, PerPageTable, KeyboardIssuesSection, ViewportBreakdownSection
  dashboard/            ScoreTrendChart, AlertDropdown
  billing/              PricingCard, SubscriptionBadge, BillingToggle
  chat/                 ComplianceAssistant
  layout/               Navbar, Sidebar, Footer, SignOutButton
  legal/                LegalPageLayout
  auth/                 AuthErrorBanner
  cookies/              CookieConsent
  pwa/                  InstallPrompt
  theme/                ThemeProvider, ThemeToggle

lib/
  scanner/              engine, credits, scoring, severity, violations, riskScore, batchProcessor, screenshot, statusTracker (Step 10)
                        ▸ Step 1's crawler.ts is NOT YET on disk.
  security/             validateUrl (Step 7 — DNS-aware), rateLimit, sanitize
  dodo/                 plans, client (live/test toggle)
  email/                resend
  pdf/                  generator, categoryMapping, disabilityTags
  vpat/                 wcagCriteria, conformance, renderhtml
  supabase/             client + middleware + server
  api-keys/             generate, utils
  monitoring/           geoLookup
  escapeHtml, utils, csv

supabase/
  migrations/           18 files + 6 newer ones for shared_reports, monitoring, api_keys, multiscan
  functions/            scheduled-scan (Deno edge function; has its own APP_URL env)

types/                  database, scan, user, report

scripts/                multiscan-worker.mjs (Node-side parallel worker)

extensions/             wcag-chrome/ (Step 12 — Manifest V3 / vanilla JS)

github-action/          action.yml + run-scan.js + README.md (Step 5 — public repo TBD)

public/                 manifest.json, sw.js, offline.html

.github/workflows/      process-batch-cron, monitoring-cron, multiscan

middleware.ts           cookie + Bearer-aware route gate; CRON_* whitelisted
                          so the GitHub → /api/cron/* call doesn't get redirected.
                          /api/v1/* fully bypasses session handling.
```

---

## 8. Human Action Required (cannot be fully automated)

> These are the items only you, as the operator, can verify or execute.
> Until they're done, certain flows will fail at deploy time.

### 8.1 Create Dodo Payments products (BLOCKS live checkout)

1. Log into `https://app.dodopayments.com`.
2. Create 6 products total:
   - **Starter** monthly — $29 — name and description to match
     `lib/dodo/plans.ts`.
   - **Starter** annual — $290 (2 months free).
   - **Growth** monthly — $89.
   - **Growth** annual — $890.
   - **Enterprise** monthly — $175.
   - **Enterprise** annual — $1,750.
3. For each, set the success URL to
   `${NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1` and the failure URL
   to `${NEXT_PUBLIC_APP_URL}/billing?failed=1`.
4. Copy each product ID into the matching env var (§5.2).
5. Set up the Dodo webhook endpoint to
   `https://www.wcagscannerr.com/api/dodo/webhook` and put the signing
   secret into `DODO_PAYMENTS_WEBHOOK_KEY`.

### 8.2 Configure Resend sending domain

1. Verify your domain in Resend.
2. Set the from-address (e.g. `reports@wcagscannerr.com` — referenced
   in notifications on `app/api/cron/run-monitoring/route.ts` and
   `app/api/cron/scan/route.ts`).
3. Put the API key in `RESEND_API_KEY`.

### 8.3 Create the public GitHub Action repo (Step 5)

1. Create a **new PUBLIC repo** under the org (e.g.
   `wcagscannerr/wcag-action`).
2. Push the contents of `github-action/` (`action.yml`,
   `run-scan.js`, `README.md`).
3. Tag a SemVer release (`v1.0.0`).
4. (Optional) Submit to GitHub Marketplace. Until then, consumers
   reference it as `wcagscannerr/wcag-action@v1`.

The main app repo stays private; only this thin wrapper is public.

### 8.4 Manual smoke test — Chrome extension (Step 12)

1. Open Chrome → `chrome://extensions/`.
2. Enable Developer Mode → "Load unpacked" → select
   `extensions/wcag-chrome/`.
3. Visit any webpage, click the extension icon → run scan.
4. Verify the score renders within ~3 seconds on a typical site.
5. Click "See full report" → confirm the new tab opens
   `https://www.wcagscannerr.com/free-scan?url=...` with the URL
   pre-filled.
6. Submit → confirm the scan runs (it's a free scan, no signup
   required, and the deep link should pre-fill the URL field
   correctly).

### 8.5 Pin the axe-core CDN version (consistency + Step 1)

`lib/scanner/engine.ts` loads axe from
`https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js`
and so does `extensions/wcag-chrome/content.js`. These are
hard-coded strings and can drift independently. Until you wire a
single source of truth (e.g. an exported constant
`ENGINE_AXE_VERSION = '4.10.3'` from `lib/scanner/engine.ts` and
referenced from the extension's `manifest.json` web_accessible_resources
+ content.js), there's a real risk that future bumps happen on the
server side but not the extension side, or vice versa.

Short-term fix: when bumping axe-core, bump **both** call sites in
the same PR.

### 8.6 Ship Step 1 — the recursive crawler

`lib/scanner/crawler.ts` is missing from the working tree. Both the
standalone GitHub Actions worker (`scripts/multiscan-worker.mjs`'s
`discoverLinks` function) and the multiscan / batch routes in
`app/api/scan/multiscan/route.ts` and `app/api/scan/batch/route.ts`
call into it. Until it ships:
- Multiscan only discovers the seed URL + its direct `<a href>` links.
- `multiscanPageCap` per tier is NOT being enforced (caller passes
  `maxPages` to its own `discoverLinks` which hard-caps at the
  caller-provided value — but the recursive BFS that would let us
  *fill* that cap beyond the seed's direct links is missing).

### 8.7 Ship Step 9 — client sub-accounts / white-label portal

Sequence planned:
- **PR 9.1** — `client_accounts` table + RLS keyed off
  `app_metadata.active_client_id` (parent agency JWT carries the
  child claim; no new `auth.users` row).
- **PR 9.2** — invite-token flow (`create_invitation()` RPC that
  creates a claim without a password) + `/client-portal` route
  gated by middleware that toggles `active_client_id` on the JWT
  via `supabase.auth.updateUserById`.
- **PR 9.3** — UI components (stripped-down score + report view,
  restricted nav, no billing/settings access).

This is a multi-PR effort — not a single commit. Schedule after
Step 8 is verified live.

### 8.8 Clean up pre-existing Step 2 residue

`app/(dashboard)/billing/page.tsx` has 7 TS errors around
lines 138–168 (missing closing tags). It's been flagged during every
typecheck pass since Step 2 but isn't blocking deploy (Next.js
build only blocks on **first** file-route error, and this file is
not the build's first failure in practice). Worth fixing before
adding a CI typecheck gate.

### 8.9 Schedule the backfills

After deploying, run each of these ONCE in production:
- `POST /api/cron/backfill-monitoring-reports` with
  `Authorization: Bearer $CRON_SECRET` — generates any missing
  monitoring reports for sites that ran scans before
  migration 014 was applied.
- Subscription-tier re-sync — check Dodo for customers whose
  `subscription_status` on `profiles` drifted from their Dodo
  subscription (run via Supabase Dashboard SQL).

---

## 9. Development Commands

```bash
npm run dev          # next dev
npm run build        # next build
npm run start        # next start (post-build)
npm run lint         # next lint (ESLint + custom config)

# type-check (manual, optional)
npx tsc --noEmit -p tsconfig.json

# local DB inspection
supabase start
psql $DATABASE_URL -c "select * from scan_credits_ledger order by created_at desc limit 20"

# trigger cron endpoints manually (during bring-up)
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://www.wcagscannerr.com/api/cron/process-batch
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://www.wcagscannerr.com/api/cron/run-monitoring
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://www.wcagscannerr.com/api/cron/backfill-monitoring-reports

# debug-secret route (TEMP — delete after CRON_SECRET mismatch is sorted)
# GET /api/cron/debug-secret — returns whether CRON_SECRET is set + a few diagnostic fields
```

---

## 10. Security Model Summary

- **SSRF** is gated by `lib/security/validateUrl.ts` (Step 7) which
  resolves DNS and checks both IPv4 and IPv6 ranges against a
  RFC-correct block list. Residual DNS-rebinding window explicitly
  accepted — Vercel egress firewall + short window make it acceptable
  for our threat model.
- **Rate limiting** is per-identifier, per-action (`lib/security/rateLimit.ts`).
- **API keys** are SHA-256 hashed; only the prefix is displayed.
- **RLS** is enabled on every public-facing table (`profiles`,
  `scans`, `violations`, `reports`, `monitored_sites`, `api_keys`,
  `scan_credits_ledger`, `violation_status`). Service-role key
  bypasses RLS for back-office writes.
- **Dodo webhook** uses HMAC-SHA256 signature verification
  (`standardwebhooks` package).
- **CSP / headers** are configured globally in `next.config.js`,
  api routes get a stricter `Cache-Control: no-store` rule, and
  every response inherits the standard Web security headers (CSP,
  HSTS, X-Frame-Options DENY, etc.).
- **XSS escape** on user-tainted content via `lib/escapeHtml.ts`.

---

## 11. Testing the Public API Locally

```bash
# Generate an API key in /settings/api-keys  (Enterprise-only)
# Then:
curl -X POST http://localhost:3000/api/v1/scan \
  -H "Authorization: Bearer wca_XXXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "fail_threshold": 85}'

# Expected output: HTTP 200 on pass, 400 if score < 85,
# 403 if you're not on Enterprise.
```

---

## 12. Where the AI Assistant Lives

`components/chat/ComplianceAssistant.tsx` is the UI; `app/api/chat/route.ts`
is the proxy to DeepSeek. The compliance assistant reads the user's
scan data from Supabase and answers WCAG questions with that
context. Falls through to DeepSeek's stock model when no scan
exists yet.

The AI-fix endpoint (`app/api/violations/[id]/ai-fix/route.ts`) prefers
Claude when `ANTHROPIC_API_KEY` is set; otherwise it falls through
to DeepSeek. The fix response is cached in `ai_fixes` (migration 003)
so repeated calls on the same violation don't re-charge the AI provider.

---

## 13. Things explicitly **out of scope** for this doc

- Production observability (no Datadog/Sentry/Honeycomb is in the
  working tree). If you want runtime logs, wire a Next.js logger
  or log drain to your provider of choice.
- i18n / multi-language landing pages.
- Stripe migration / billing-portal comparison (the project
  committed to Dodo for the foreseeable launch; no Stripe code
  in tree).
- SOC 2 / GDPR DPA — outside the codebase, but the schema is
  ready (FK on `auth.users.id` + RLS).

---

## 14. Hot Reference — key entry points

| Need to...                                              | Open |
|---------------------------------------------------------|------|
| Add a new tier / change pricing                         | `lib/dodo/plans.ts` + `lib/dodo/client.ts` |
| Change the scanner output or scoring                    | `lib/scanner/engine.ts` + `lib/scanner/scoring.ts` |
| Add a refund or credit rule                             | `lib/scanner/credits.ts` |
| Add a status to violations                              | `lib/scanner/statusTracker.ts` + `components/scanner/ViolationCard.tsx` |
| Block more URLs / private ranges from being scanned     | `lib/security/validateUrl.ts` + its blockList |
| Add a new cron job                                      | `app/api/cron/<name>/route.ts` + `.github/workflows/<name>.yml` |
| Add a new API key capability                            | `lib/api-keys/generate.ts` + `app/api/v1/keys/route.ts` |
| Add a new VPAT criterion                                | `lib/vpat/wcagCriteria.ts` |
| Change the marketing home page                          | `components/landing/Hero.tsx` + `components/landing/SocialProof.tsx` + `app/page.tsx` |
| Change what a paying customer sees                      | `components/billing/PricingCard.tsx` + `app/(dashboard)/billing/page.tsx` |

---

**End of SETUP.md.** When all `NOT SHIPPED` items in §4 and all
items in §8 are done, deploy by connecting the repo to Vercel,
pushing the env vars from §5, and verifying the three curl
endpoints in §9.
