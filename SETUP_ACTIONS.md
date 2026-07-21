# Human Action Required — What You Need to Do

> These items cannot be automated. You must complete them before the app is fully functional in production.

---

## 1. Create Dodo Payments Products (BLOCKS live checkout)

1. Log into https://app.dodopayments.com
2. Create **6 products** total:
   - **Starter** monthly — $29
   - **Starter** annual — $290
   - **Growth** monthly — $89
   - **Growth** annual — $890
   - **Enterprise** monthly — $175
   - **Enterprise** annual — $1,750
3. For each, set:
   - Success URL: `${NEXT_PUBLIC_APP_URL}/dashboard?upgraded=1`
   - Failure URL: `${NEXT_PUBLIC_APP_URL}/billing?failed=1`
4. Copy each product ID into the matching env var in `.env.local`:
   - `DODO_STARTER_PRODUCT_ID`, `DODO_STARTER_ANNUAL_PRODUCT_ID`
   - `DODO_GROWTH_PRODUCT_ID`, `DODO_GROWTH_ANNUAL_PRODUCT_ID`
   - `DODO_ENTERPRISE_PRODUCT_ID`, `DODO_ENTERPRISE_ANNUAL_PRODUCT_ID`
5. Set up the Dodo webhook endpoint to `https://www.wcagscannerr.com/api/dodo/webhook`
6. Put the signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`

---

## 2. Configure Resend Sending Domain

1. Verify your domain in [Resend](https://resend.com)
2. Set the from-address (e.g. `reports@wcagscannerr.com`)
3. Put the API key in `RESEND_API_KEY`

---

## 3. Create the Public GitHub Action Repo

1. Create a **new PUBLIC repo** under your org (e.g. `wcagscannerr/wcag-action`)
2. Push the contents of `github-action/` folder:
   - `action.yml`
   - `run-scan.js`
   - `README.md`
3. Tag a SemVer release (`v1.0.0`)
4. (Optional) Submit to GitHub Marketplace

The main app repo stays **private**; only this thin wrapper is public.

---

## 4. Manual Smoke Test — Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable Developer Mode → "Load unpacked" → select `extensions/wcag-chrome/`
3. Visit any webpage, click the extension icon → run scan
4. Verify the score renders within ~3 seconds
5. Click "See full report" → confirm new tab opens `https://www.wcagscannerr.com/free-scan?url=...`
6. Submit → confirm the scan runs with the URL pre-filled

---

## 5. Pin axe-core CDN Version

`lib/scanner/engine.ts` loads axe from `https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.3/axe.min.js`. When bumping axe-core, bump **both** the engine AND the extension's `content.js` in the same PR.

---

## 6. Ship the Recursive Crawler (Step 1)

`lib/scanner/crawler.ts` is **missing** from the working tree. Both the multiscan worker and batch routes call into it. Until shipped:
- Multiscan only discovers the seed URL + direct links
- `multiscanPageCap` per tier is NOT enforced

---

## 7. Ship Client Sub-Accounts (Step 9)

Multi-PR sequence planned:
- **PR 9.1** — `client_accounts` table + RLS
- **PR 9.2** — invite-token flow + `/client-portal` route
- **PR 9.3** — UI components (stripped-down score + report view)

---

## 8. Run One-Time Backfills After Deploy

```bash
# Generate missing monitoring reports
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://www.wcagscannerr.com/api/cron/backfill-monitoring-reports

# Subscription-tier re-sync — check Dodo for drifted profiles
# Run via Supabase Dashboard SQL
```

---

## 9. GitHub Actions Secrets

Set these in your repo's **Settings → Secrets and variables → Actions**:

```
NEXT_PUBLIC_APP_URL
CRON_SECRET
RESEND_API_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
```

---

## 10. Quick Reference — What's Already Done

| Item | Status |
|------|--------|
| Pricing tiers (Free/Starter/Growth/Enterprise) | ✅ Done |
| VPAT access gating (Growth+) | ✅ Done |
| .env.example | ✅ Done |
| Build errors fixed | ✅ Done |
| Public GitHub Action repo | ❌ You need to create it |
| Dodo Payments products | ❌ You need to create them |
| Resend domain verification | ❌ You need to verify |
| Chrome extension smoke test | ❌ You need to test |
| Recursive crawler (Step 1) | ❌ Not yet shipped |
| Client sub-accounts (Step 9) | ❌ Not yet started |
