# 🔧 FOR YOU — WCAG Scanner Setup Guide

Everything you need to set up, deploy, and maintain this project in a private repo.

---

## 📋 Table of Contents

- [Environment Variables](#-environment-variables)
- [Supabase Setup](#-supabase-setup)
- [Vercel Deployment](#-vercel-deployment)
- [GitHub Actions (CI/CD)](#-github-actions-cicd)
- [API Testing](#-api-testing)
- [Local Development](#-local-development)
- [Dodo Payments](#-dodo-payments)
- [Common Issues](#-common-issues)

---

## 🔐 Environment Variables

### Required (no default)

| Variable | Where to get it | Used for |
|----------|----------------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API | Frontend + API Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same page as above | Frontend Supabase client (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page as above, **keep secret** | Server-side Supabase client (bypasses RLS) |
| `SUPABASE_ACCESS_TOKEN` | Supabase Dashboard → Settings → Access Tokens | Running `npx supabase db push` locally |
| `CRON_SECRET` | Generate via: `openssl rand -hex 32` | Secures cron endpoints from unauthorized calls |

### Dodo Payments (for subscriptions)

| Variable | Where to get it | Used for |
|----------|----------------|----------|
| `DODO_API_KEY` | [Dodo dashboard](https://dodopayments.com) → Settings → API Keys | Subscription management |
| `DODO_WEBHOOK_SECRET` | Dodo dashboard → Webhooks → Your webhook | Verifying webhook signatures |
| `DODO_STARTER_PRODUCT_ID` | Dodo dashboard → Products → Starter | Starter plan product reference |
| `DODO_STARTER_ANNUAL_PRODUCT_ID` | Dodo dashboard → Products → Starter (Annual) | Annual Starter plan |
| `DODO_GROWTH_PRODUCT_ID` | Dodo dashboard → Products → Growth | Growth plan product reference |
| `DODO_GROWTH_ANNUAL_PRODUCT_ID` | Dodo dashboard → Products → Growth (Annual) | Annual Growth plan |
| `DODO_ENTERPRISE_PRODUCT_ID` | Dodo dashboard → Products → Enterprise | Enterprise plan product reference |
| `DODO_ENTERPRISE_ANNUAL_PRODUCT_ID` | Dodo dashboard → Products → Enterprise (Annual) | Annual Enterprise plan |

### Resend (for emails)

| Variable | Where to get it | Used for |
|----------|----------------|----------|
| `RESEND_API_KEY` | [Resend dashboard](https://resend.com) → API Keys | Sending compliance reports, alerts |
| `RESEND_AUDIENCE_ID` | Resend dashboard → Audience | Newsletter subscriber list |

### GitHub Actions (for multi-page/batch scanning)

| Variable | Where to get it | Used for |
|----------|----------------|----------|
| `SUPABASE_URL` | Same as `NEXT_PUBLIC_SUPABASE_URL` | Multi-page worker connects to DB |
| `SUPABASE_SERVICE_ROLE_KEY` | Same as above | Worker has service-level DB access |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL (e.g. `https://wcagscannerr.com`) | Callback URL for scan completion |

### Vercel (deployment)

Add ALL of the above as Vercel Environment Variables:
1. Go to Vercel Project → Settings → Environment Variables
2. Add each variable (check "Production" + "Preview" + "Development")
3. For secrets like `SUPABASE_SERVICE_ROLE_KEY`, mark them as "Encrypted"

---

## 🗄️ Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a project
2. Note your project URL and API keys from **Project Settings → API**

### 2. Install Supabase CLI (one-time)

```bash
npm install -g supabase
# or
npx supabase --version
```

### 3. Link to your remote project

```bash
npx supabase login
# Paste your SUPABASE_ACCESS_TOKEN when prompted

npx supabase link --project-ref <your-project-ref>
# Project ref is the subdomain in your Supabase URL:
# https://<project-ref>.supabase.co
```

### 4. Push all migrations

```bash
npx supabase db push
```

This applies all SQL files from `supabase/migrations/` in order.

### 5. Verify migrations were applied

```bash
npx supabase migration list
```

Or check in Supabase Dashboard → **SQL Editor** → run:
```sql
SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
```

### 6. Check RLS is working

In Supabase Dashboard → **SQL Editor**, run:
```sql
-- Check all tables have RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename NOT LIKE '_prisma%'
ORDER BY tablename;

-- Check all policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 7. Grant yourself Enterprise plan

In Supabase Dashboard → **SQL Editor**, run:
```sql
-- Replace YOUR_USER_ID with your actual auth user UUID
UPDATE profiles 
SET subscription_status = 'enterprise' 
WHERE id = 'YOUR_USER_ID';
```

To find your user ID:
1. Go to Supabase Dashboard → **Authentication → Users**
2. Copy your user UUID
3. Or run: `SELECT id, email FROM profiles WHERE email = 'your@email.com';`

---

## 🚀 Vercel Deployment

### 1. Connect your repo

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your private GitHub repo
3. Vercel will auto-detect Next.js

### 2. Add environment variables

Add ALL the env vars from the table above in:
Vercel → Project → Settings → Environment Variables

### 3. Configure Build Settings

Framework preset: **Next.js**
Build command: `npm run build`
Output directory: `.next`
Install command: `npm install`

### 4. Serverless Function Configuration

The `vercel.json` file already configures:
- Scan API routes: 300s timeout, 2GB memory
- Cron jobs for batch processing and monitoring

### 5. Redeploy

```bash
git push origin main
```

Vercel auto-deploys on push to `main`.

> ⚠️ **Important**: After pushing, check Vercel build logs for errors. Common issues:
> - Missing env vars → add them in Vercel dashboard
> - TypeScript errors → fix and push again
> - "Module not found: Can't resolve 'puppeteer-core'" → change import to `puppeteer` (already fixed)

---

## 🤖 GitHub Actions (CI/CD)

### Workflow Files

This project includes:

1. **Multi-page scanner** — `scripts/multiscan-worker.mjs` runs on GH Actions runners (more RAM than Vercel)
2. **GitHub Action for CI scans** — `github-action/action.yml` lets others run scans in their CI pipeline

### Setup Secrets

1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add these **Repository secrets**:

| Secret name | Value |
|------------|-------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (bypasses RLS) |
| `CRON_SECRET` | Same as the env var above |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

### Example CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Lint
        run: npm run lint
      
      - name: Build
        run: npm run build
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          # Add all other required env vars here...

  # Optional: Run accessibility scan on staging
  a11y-scan:
    needs: lint-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run WCAG scan on staging
        uses: ./github-action
        with:
          api-key: ${{ secrets.WCAG_API_KEY }}
          url: https://staging.example.com
          fail-threshold: 85
```

### Multi-page Scanner Workflow

Create `.github/workflows/multiscan.yml`:

```yaml
name: Multi-page Scan

on:
  workflow_dispatch:
    inputs:
      url:
        description: 'URL to scan'
        required: true
      pages:
        description: 'Number of pages to scan'
        default: '10'

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Install Chromium
        run: sudo apt-get update && sudo apt-get install -y chromium-browser
      
      - name: Run multi-page scan
        run: node scripts/multiscan-worker.mjs
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          NEXT_PUBLIC_APP_URL: ${{ secrets.NEXT_PUBLIC_APP_URL }}
```

---

## 🧪 API Testing

### Health Check

```bash
curl https://www.wcagscannerr.com/api/scan-activity
# Should return: {"active":true,"recentScans":42,...}
```

### Free Scan (no auth required)

```bash
curl -X POST https://www.wcagscannerr.com/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
# Returns scan result with compliance score
```

### API Scan (requires Enterprise API key)

```bash
# 1. Get your API key from Dashboard → Settings → API Keys
# 2. Run the scan
curl -X POST https://www.wcagscannerr.com/api/v1/scan \
  -H "Authorization: Bearer wcag_live_xxxxx" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","wcag_version":"2.1","fail_threshold":85}'

# Expected success response (score >= 85):
# HTTP 200, {"passed":true,"score":92,"summary":{...}}

# Expected failure response (score < 85):
# HTTP 400, {"passed":false,"score":64,"summary":{...}}
```

### Auth-protected endpoints

```bash
# Login first to get a session cookie, then:
curl https://www.wcagscannerr.com/api/user \
  -H "Cookie: <your-session-cookie>"
# Returns: {"profile":{...},"plan":{...}}
```

### Local testing

```bash
# Start dev server
npm run dev

# Then test endpoints locally:
curl http://localhost:3000/api/scan-activity
curl http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}'
```

---

## 💻 Local Development

### Prerequisites

- Node.js 20+ 
- npm 10+

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local  # Create if doesn't exist

# 3. Add all required env vars to .env.local
# See the Environment Variables table above

# 4. Start the dev server
npm run dev

# 5. Open http://localhost:3000
```

### Project structure

```
wcagscannerr/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/               # API endpoints
│   │   ├── scan/          # Scan execution
│   │   ├── v1/scan/       # Public API v1 (CI/CD integration)
│   │   ├── dodo/          # Subscription webhooks
│   │   ├── monitoring/    # Site monitoring endpoints
│   │   ├── reports/       # Report CRUD + PDF generation
│   │   └── user/          # User profile
│   ├── (dashboard)/       # Protected dashboard pages
│   └── landing/           # Public pages (home, pricing, etc.)
├── components/            # React components
│   ├── landing/           # Landing page components
│   ├── scanner/           # Scan UI components
│   ├── reports/           # Report components
│   └── dashboard/         # Dashboard components
├── lib/                   # Shared utilities
│   ├── scanner/           # Scan engine + credits
│   ├── supabase/          # Supabase clients
│   ├── dodo/              # Payment plans + client
│   └── pdf/               # PDF generation
├── hooks/                 # React hooks
├── types/                 # TypeScript types
├── supabase/
│   └── migrations/        # Database migrations (apply in order)
└── scripts/               # Utility scripts
    └── multiscan-worker.mjs  # GH Actions multi-page scanner
```

### Useful commands

```bash
npm run dev        # Start dev server
npm run build      # Production build (tests for compilation errors)
npm run lint       # Run ESLint
npm start          # Start production server
npx supabase db push    # Push migrations to remote Supabase
npx supabase migration list  # Check which migrations are applied
```

---

## 💳 Dodo Payments

This app uses [Dodopayments](https://dodopayments.com) for subscription billing.

### Setup steps:

1. **Create a Dodo account** at [dodopayments.com](https://dodopayments.com)
2. **Create products** in the Dodo dashboard:
   - Starter ($29/month, $290/year)
   - Growth ($89/month, $890/year)
   - Enterprise ($175/month, $1750/year)
3. **Copy product IDs** from each product page
4. **Set up a webhook** in Dodo dashboard → Webhooks:
   - URL: `https://your-domain.com/api/dodo/webhook`
   - Events: `payment.succeeded`, `subscription.cancelled`, `subscription.updated`
5. **Copy webhook secret** from the webhook page
6. **Add all Dodo env vars** to Vercel and local `.env.local`

### Billing flow:

```
User clicks "Upgrade" → Dodo checkout page → Payment succeeds →
Dodo sends webhook → /api/dodo/webhook updates profile →
User gets upgraded plan
```

---

## 🐛 Common Issues

### "Permission denied for table X"

**Fix:** Run migration 022 which grants explicit permissions:
```bash
npx supabase db push
```
Or manually in Supabase SQL Editor:
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
```

### "Permission denied for table reports"

**Fix:** If the above GRANT doesn't work, ensure RLS policies exist:
```sql
-- Check reports table has a policy for authenticated users
SELECT * FROM pg_policies WHERE tablename = 'reports';
```

### "Failed to insert scan" (service_role)

**Fix:** The service_role needs explicit table permissions. Run migration 020:
```bash
npx supabase db push
```
Or manually:
```sql
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
```

### "Scans showing 6 instead of 3 for free users"

**Fix:** Run migration 022 which cleans up duplicates and adds a unique index:
```bash
npx supabase db push
```
This deletes duplicate monthly_grant rows and prevents future duplicates.

### "Build fails with 'Cannot find module puppeteer-core'"

**Fix:** The scanner was changed from `puppeteer-core` to `puppeteer`. If you add new scan files, import from `puppeteer`:
```typescript
import puppeteer from 'puppeteer';  // ✅ correct
// import puppeteer from 'puppeteer-core';  // ❌ wrong
```

### "Migration fails saying table already exists"

All migrations use `CREATE TABLE IF NOT EXISTS` and conditional DO blocks. If a migration fails:
1. Check if the table already exists
2. If so, run `npx supabase migration repair --status applied <migration-name>`
3. Then re-run `npx supabase db push`

### "GitHub Actions workflow not running"

Check:
1. Secrets are added to the repo (Settings → Secrets and variables → Actions)
2. Workflow files are in `.github/workflows/`
3. The workflow trigger condition is met (e.g., push to main, or manual trigger)

### "Cron jobs not running"

Vercel cron jobs run on the Pro plan or higher. Check:
1. You're on Vercel Pro ($20/mo) — cron requires it
2. The `vercel.json` cron configuration is correct
3. Environment variables are set in Vercel dashboard

---

## 🔄 Full Re-deployment Checklist

When setting up in a new private repo:

- [ ] Clone the repo
- [ ] Install deps: `npm install`
- [ ] Create Supabase project
- [ ] Run: `npx supabase login && npx supabase link --project-ref <ref> && npx supabase db push`
- [ ] Create Dodo account + products + webhook
- [ ] Add ALL env vars to Vercel
- [ ] Deploy to Vercel (auto-deploy on push)
- [ ] Add GitHub secrets for CI/CD
- [ ] Test: `curl https://your-domain.com/api/scan-activity`
- [ ] Test: Run a free scan
- [ ] Create a test user and verify dashboard works
- [ ] Upgrade yourself to Enterprise via SQL Editor

---

> **Last updated:** July 21, 2026
> **Project:** WCAG Scanner — Automated accessibility auditing
