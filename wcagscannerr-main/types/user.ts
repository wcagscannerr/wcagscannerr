// Step 2: SubscriptionStatus enum now includes starter/growth/enterprise.
// Pre-launch — no live customers — so pro/agency are gone and only the new
// tier names remain valid.
export type SubscriptionStatus = 'free' | 'starter' | 'growth' | 'enterprise';

// Step 2: PlanLimits now exposes BOTH the monthly scan quota (scansPerMonth)
// AND a separate multiscanPageCap (Step 1 crawler's maxPages). Do not reuse
// pagesPerScan for the multiscan cap — they mean different things:
//   - pagesPerScan        : per-request page cap for /api/v1/scan and similar
//                            single-scan callers (e.g. CI/CD max pages param)
//   - multiscanPageCap    : the multiscan / batch-scan CRAWL cap — max pages
//                            the crawler will discover+queue for one batch
//                            (drives the multiscan/batch-scan workflow)
export interface PlanLimits {
  scansPerMonth: number;
  pageRendersPerMonth: number; // Step 8 — distinct from scansPerMonth, bounds the compute-cost tail.
  pagesPerScan: number;
  multiscanPageCap: number;
  monitoredSites: number;
  seats: number | 'unlimited';
  historyDays: number;
  pdfReports: boolean;
  apiAccess: boolean;
  agencyDashboard: boolean;
  whiteLabel: boolean;
  aiFixesPerMonth: number;
  vpatGeneration: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  dodoProductId: string | null;
  dodoAnnualProductId: string | null;
  limits: PlanLimits;
  features: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  stripe_customer_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_id: string | null;
  current_period_end: string | null;
  // Step 4: scans_used_this_month removed. Use scan_credits_ledger SUM(delta)
  // via lib/scanner/credits.ts getScansRemaining(userId).
  created_at: string;
  updated_at: string;
}
