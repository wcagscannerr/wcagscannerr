# WCAG Scanner — Automated Accessibility Compliance Audits

[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.49-3ECF8E?logo=supabase)](https://supabase.com/)
[![axe-core](https://img.shields.io/badge/axe--core-4.10-005A9C)](https://github.com/dequelabs/axe-core)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

> **Production-ready SaaS platform for automated WCAG 2.1/2.2 accessibility auditing.** Scan any website, detect violations that cause 96% of ADA lawsuits, and generate compliance reports with AI-powered fix suggestions.

🌐 **Live Demo:** [https://www.wcagscannerr.com](https://www.wcagscannerr.com)

---

## ✨ Features

### Core Scanning Engine
- **axe-core v4.10.3** — Industry-standard accessibility testing engine (same as Google Lighthouse)
- **WCAG 2.1 & 2.2** Level A/AA/AAA conformance testing
- **Headless Chromium** browser automation with Puppeteer
- **Logarithmic scoring algorithm** — Penalizes repeated violations fairly without crushing scores to 0
- **"Big Six" violation detection** — Color contrast, alt text, form labels, link names, button names, document language (96% of lawsuit causes)

### Scan Types
| Feature | Free | Pro ($25/mo) | Agency ($60/mo) |
|---------|------|-------------|-----------------|
| Single-page scans | ✅ | ✅ | ✅ |
| Batch scans | — | Up to 10 URLs | Up to 25 URLs |
| Multi-viewport responsive testing | — | ✅ | ✅ |
| Keyboard navigation audit | — | ✅ | ✅ |
| Annotated screenshots with violation overlays | — | ✅ | ✅ |
| Site monitoring (weekly/monthly) | — | 5 sites | 25 sites |
| VPAT & ACR generation | — | — | ✅ |

### Reports & Exports
- **PDF Reports** — Formatted A4 compliance reports with executive summary
- **CSV Export** — Spreadsheet-friendly violation data for development teams
- **HTML Accessibility Statement** — Publish-ready statement page (Pro/Agency)
- **VPAT/ACR Generation** — Voluntary Product Accessibility Template / Accessibility Conformance Report (Agency only)
- **Shared Report Links** — Public, expiring share URLs for client delivery

### AI-Powered Features
- **Compliance Assistant** — AI chatbot (DeepSeek/Claude) that knows your scan data and answers WCAG questions
- **AI Fix Generator** — One-click HTML fix suggestions for each violation
- **Lawsuit Risk Score** — Statistical risk assessment based on 2025 ADA lawsuit data

### Developer API
- **REST API** with Bearer token authentication
- **CI/CD Integration** — GitHub Actions, GitLab CI, Jenkins support
- **Rate limiting** — 60 requests/minute per API key
- **Exit-code friendly** — Returns HTTP 400 when score is below threshold

### Subscription & Billing
- **Dodo Payments** integration (Stripe alternative)
- **Monthly & Annual** billing with prorated refunds
- **Customer portal** for self-service subscription management
- **Webhook handling** for subscription lifecycle events

---

## 🏗 Architecture

```
WCAG Scanner
├── Frontend (Next.js 14 App Router)
│   ├── Landing Pages (marketing, pricing, compare)
│   ├── Dashboard (scans, reports, monitoring, settings)
│   ├── Auth (Supabase Auth with Google OAuth)
│   └── API Routes (REST + Server Actions)
├── Scanner Engine (Puppeteer + axe-core)
│   ├── Single-page scan with full DOM analysis
│   ├── Batch queue processor (browser-driven + cron fallback)
│   ├── Smart crawler with sitemap discovery
│   └── Screenshot annotation engine
├── AI Services
│   ├── DeepSeek API (chat + fix generation)
│   └── Claude API (fallback for fixes)
├── Database (Supabase PostgreSQL)
│   ├── Row-Level Security (RLS) enabled
│   ├── 15+ migrations with full audit trail
│   └── Storage buckets for screenshots & PDFs
└── Infrastructure
    ├── Vercel (serverless hosting)
    ├── GitHub Actions (cron jobs for monitoring)
    └── Supabase Edge Functions (scheduled scans)
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- Dodo Payments account (for billing)
- Resend account (for emails)

### 1. Clone & Install

```bash
git clone https://github.com/vaibhavdobhall/wcagscannerr.git
cd wcagscannerr
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Fill in your credentials:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `DODO_PAYMENTS_API_KEY` | Dodo Payments API key |
| `DODO_PAYMENTS_WEBHOOK_KEY` | Webhook signing secret |
| `RESEND_API_KEY` | Resend email API key |
| `DEEPSEEK_API_KEY` | DeepSeek AI API key |
| `CRON_SECRET` | Secret for cron job authentication |

### 3. Database Setup

```bash
# Run migrations via Supabase CLI or SQL Editor
# Files located in supabase/migrations/

# 001_initial_schema.sql        — Core tables (profiles, scans, violations, reports)
# 002_free_scan_usage.sql       — Anonymous scan tracking
# 003_ai_fixes.sql              — AI fix caching
# 004_lawsuit_risk.sql          — Risk score storage
# 005_compliance_assistant.sql  — Chatbot usage tracking
# 006_rate_limits.sql           — API rate limiting
# 007_newsletter_subscribers.sql — Email capture
# 008_wcag_version.sql          — WCAG 2.2 support
# 009_batch_scans.sql           — Batch processing
# 010_violation_sort_order.sql  — Display ordering
# 011_violation_node_count.sql  — Multi-node violation tracking
# 012_vpat_reports.sql          — VPAT/ACR generation
# 013_vpat_acr_pdf.sql          — ACR PDF storage
# 20250708000001_shared_reports.sql    — Public share links
# 20250708000002_monitoring_alerts.sql — Regression alerts
# 20250708000003_api_keys.sql          — Developer API keys
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📊 Scoring Methodology

The compliance score uses an **exponential decay model** that fairly penalizes violations:

```
Score = 100 × e^(-totalPenalty / 90)

Where totalPenalty = Σ (baseWeight × densityMultiplier)

baseWeight: critical=10, serious=6, moderate=3, minor=1
densityMultiplier: 1 + min(0.9, log10(nodeCount) × 0.4)
```

This means:
- 1 critical violation on 1 element ≈ 90/100
- 1 critical violation on 500 elements ≈ 85/100 (not crushed to 0)
- Many different rule violations compound softly via exponential decay

**Score Ranges:**
| Score | Label | Interpretation |
|-------|-------|----------------|
| 90–100 | Excellent | Strong compliance posture |
| 75–89 | Good | Minor issues, low legal risk |
| 50–74 | Fair | Moderate issues, remediation recommended |
| 5–49 | Poor | Significant barriers, high legal exposure |

---

## 🔌 API Usage

### Authentication
Include your API key in the `Authorization` header:

```bash
curl -X POST https://wcagscannerr.com/api/v1/scan \
  -H "Authorization: Bearer wca_xxxxxxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com", "fail_threshold": 85}'
```

### Response Format

```json
{
  "success": true,
  "scan_id": "uuid",
  "url": "https://example.com",
  "score": 85,
  "passed": true,
  "threshold": 85,
  "violations": [...],
  "summary": {
    "critical": 0,
    "serious": 2,
    "moderate": 3,
    "minor": 1,
    "total": 6
  },
  "big_six": {
    "contrast": 1,
    "alt_text": 0,
    "labels": 1,
    "links": 0,
    "buttons": 0,
    "lang": 0
  },
  "duration_ms": 12450
}
```

**HTTP Status Codes:**
- `200` — Scan passed threshold
- `400` — Scan completed but below threshold (useful for CI exit codes)
- `401` — Invalid API key
- `403` — Plan doesn't include API access
- `429` — Rate limit exceeded or scan quota exhausted

---

## 🗓 Cron Jobs

| Job | Schedule | Purpose |
|-----|----------|---------|
| `run-monitoring` | Every 15 min | Process one due monitored site per tick |
| `process-batch` | Every 5 min | Background batch scan safety net |

Both are implemented as **GitHub Actions workflows** that hit authenticated API endpoints, avoiding Vercel's Hobby cron limitations.

---

## 🛡 Security Features

- **URL validation** — Blocks private IPs, localhost, and file protocols
- **Rate limiting** — Per-identifier, per-action window tracking
- **API key hashing** — SHA-256 with prefix display only
- **Row-Level Security** — Users can only access their own data
- **Webhook signature verification** — HMAC-SHA256 for Dodo Payments
- **CSP bypass** — Controlled for screenshot generation only

---

## 🧪 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS 3.4 + Radix UI primitives |
| Animation | Framer Motion |
| Charts | Recharts |
| Database | Supabase (PostgreSQL + Storage) |
| Auth | Supabase Auth (email + Google OAuth) |
| Payments | Dodo Payments |
| Email | Resend |
| AI | DeepSeek API / Claude API |
| Browser | Puppeteer + @sparticuz/chromium-min |
| Testing | axe-core 4.10.3 |
| Validation | Zod |

---

## 📁 Project Structure

```
├── app/                    # Next.js App Router
│   ├── (auth)/            # Auth pages (login, signup, reset)
│   ├── (dashboard)/       # Protected dashboard routes
│   ├── (legal)/           # Legal pages (privacy, terms, etc.)
│   ├── api/               # API routes
│   │   ├── chat/          # AI Compliance Assistant
│   │   ├── cron/          # Cron job endpoints
│   │   ├── dodo/          # Payment webhooks & checkout
│   │   ├── monitoring/    # Site monitoring CRUD
│   │   ├── reports/       # PDF/CSV/statement exports
│   │   ├── scan/          # Scan execution & batch queue
│   │   ├── v1/keys/       # API key management
│   │   └── v1/scan/       # Public CI/CD API
│   └── ...                # Marketing & tool pages
├── components/            # React components
│   ├── landing/           # Marketing sections
│   ├── scanner/           # Scan UI components
│   ├── reports/           # Report visualizations
│   ├── dashboard/         # Dashboard widgets
│   ├── chat/              # AI chat interface
│   └── layout/            # Navigation & shell
├── lib/                   # Business logic
│   ├── scanner/           # Core engine (engine.ts, crawler.ts, scoring.ts, etc.)
│   ├── api-keys/          # Key generation & validation
│   ├── dodo/              # Payment client & plan definitions
│   ├── email/             # Resend integration
│   ├── pdf/               # PDF generation helpers
│   ├── vpat/              # VPAT/ACR conformance logic
│   ├── security/          # Rate limiting & URL validation
│   └── supabase/          # Client configurations
├── types/                 # TypeScript type definitions
├── supabase/
│   ├── functions/         # Edge Functions (Deno)
│   └── migrations/        # Database schema (15+ files)
└── .github/workflows/     # GitHub Actions cron jobs
```

---

## 📝 License

MIT License — see [LICENSE](LICENSE)

---

## 🤝 Support

- **Email:** [reports@wcagscannerr.com](mailto:reports@wcagscannerr.com)
- **Documentation:** [https://www.wcagscannerr.com/help-center](https://www.wcagscannerr.com/help-center)
- **Status:** Typically responds within 24 hours on business days

---

> **Disclaimer:** WCAG Scanner provides automated testing only, detecting approximately 57% of WCAG success criteria. Results do not constitute legal advice or guarantee ADA compliance. Always consult a qualified attorney and accessibility specialist for legal certainty.
