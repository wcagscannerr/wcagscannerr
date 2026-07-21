// ================================================
// Step 2 — Finalized pricing structure
// Replaces free/pro/agency with free/starter/growth/enterprise.
//
// Two SEPARATE caps per tier, do not collapse:
//   - scansPerMonth     : total monthly scan quota
//   - multiscanPageCap  : cap on the Step-1 recursive crawler (maxPages
//                         fed into discoverPages). Distinct from pagesPerScan,
//                         which remains the per-request cap for /api/v1/scan.
//
// Dodo product IDs come from env vars — they MUST exist in the Dodo
// dashboard before deploy. Do not fabricate placeholder IDs.
// ================================================

import type { PlanLimits, Plan } from '@/types/user';

export type PaidTier = 'starter' | 'growth' | 'enterprise';

export const PLANS: Record<string, Plan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    annualPrice: 0,
    dodoProductId: null,
    dodoAnnualProductId: null,
    limits: {
      scansPerMonth: 3,
      pageRendersPerMonth: 3, // Step 8 — Free: bound compute-cost tail at 3 rendered pages/mo.
      pagesPerScan: 1,
      multiscanPageCap: 1,
      monitoredSites: 0,
      seats: 1,
      historyDays: 7,
      pdfReports: false,
      apiAccess: false,
      agencyDashboard: false,
      whiteLabel: false,
      aiFixesPerMonth: 0,
      vpatGeneration: false,
    },
    features: [
      '3 scans per month',
      '3 page renders per month',
      '1 page per scan',
      'Basic violation report',
      '7-day history',
    ],
  },

  starter: {
    id: 'starter',
    name: 'Starter',
    price: 29,
    annualPrice: 290,
    // Dodo dashboard: create Starter product BEFORE deploy and set IDs.
    dodoProductId: process.env.DODO_STARTER_PRODUCT_ID!,
    dodoAnnualProductId: process.env.DODO_STARTER_ANNUAL_PRODUCT_ID!,
    limits: {
      scansPerMonth: 75,
      pageRendersPerMonth: 120, // Step 8 — Starter: 120 renders/mo headroom over (5×15) max multiscan budget.
      pagesPerScan: 15,
      multiscanPageCap: 15,
      monitoredSites: 5,
      seats: 1,
      historyDays: 30,
      pdfReports: true,
      apiAccess: false,
      agencyDashboard: false,
      whiteLabel: false,
      aiFixesPerMonth: 25,
      vpatGeneration: false,
    },
    features: [
      '75 scans per month',
      '120 page renders per month',
      'Single-page scans up to 15 pages',
      'Multi-page scan (up to 15 pages)',
      'PDF compliance reports',
      'Monitor 5 sites',
      'AI-powered fixes (25/mo)',
      '30-day history',
    ],
  },

  growth: {
    id: 'growth',
    name: 'Growth',
    price: 89,
    annualPrice: 890,
    // Dodo dashboard: create Growth product BEFORE deploy and set IDs.
    dodoProductId: process.env.DODO_GROWTH_PRODUCT_ID!,
    dodoAnnualProductId: process.env.DODO_GROWTH_ANNUAL_PRODUCT_ID!,
    limits: {
      scansPerMonth: 250,
      pageRendersPerMonth: 600, // Step 8 — Growth: 600 renders/mo headroom over (10×25) max multiscan budget.
      pagesPerScan: 25,
      multiscanPageCap: 25,
      monitoredSites: 15,
      seats: 5,
      historyDays: 90,
      pdfReports: true,
      apiAccess: false,
      agencyDashboard: true,
      whiteLabel: true,
      aiFixesPerMonth: 150,
      vpatGeneration: true,
    },
    features: [
      '250 scans per month',
      '600 page renders per month',
      'Multi-page scan (up to 25 pages)',
      'Multi-site agency dashboard',
      'White-labeled PDF reports',
      'Monitor 15 sites',
      '5 seats',
      'AI-powered fixes (150/mo)',
      'VPAT & ACR generation',
      '90-day history',
    ],
  },

  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 175,
    annualPrice: 1750,
    // Dodo dashboard: create Enterprise product BEFORE deploy and set IDs.
    dodoProductId: process.env.DODO_ENTERPRISE_PRODUCT_ID!,
    dodoAnnualProductId: process.env.DODO_ENTERPRISE_ANNUAL_PRODUCT_ID!,
    limits: {
      scansPerMonth: 500,
      pageRendersPerMonth: 2500, // Step 8 — Enterprise: monthly allotment before metered overage (Phase 2).
      pagesPerScan: 50,
      multiscanPageCap: 50,
      monitoredSites: 25,
      seats: 'unlimited',
      historyDays: 365,
      pdfReports: true,
      // Critical: apiAccess is true ONLY on enterprise (Step 2 hard rule).
      // /api/v1/scan and /api/v1/keys already key off this flag, so the
      // previous starter/growth tiers lose programmatic access by default.
      apiAccess: true,
      agencyDashboard: true,
      whiteLabel: true,
      aiFixesPerMonth: 500,
      vpatGeneration: true,
    },
    features: [
      '500 scans per month',
      '2,500 page renders per month (metered overage beyond)',
      'Multi-page scan (up to 50 pages)',
      'Multi-site agency dashboard',
      'White-labeled PDF reports',
      'Monitor 25 sites',
      'Unlimited seats',
      'Full API access (CI/CD)',
      'AI-powered fixes (500/mo)',
      'VPAT & ACR generation',
      'Email alerts',
      'Dedicated support',
      '1-year history',
    ],
  },
};

export type PlanId = keyof typeof PLANS;

export function getPlanLimits(planId: string): PlanLimits {
  return PLANS[planId as PlanId]?.limits ?? PLANS.free.limits;
}

// Convenience helper for caller sites that need to gate on "any paid tier".
export function isPaidTier(planId: string): planId is PaidTier {
  return planId === 'starter' || planId === 'growth' || planId === 'enterprise';
}
