'use client';

import { useSubscription } from '@/hooks/useSubscription';
import Link from 'next/link';
import { AlertTriangle, Building2, ExternalLink } from 'lucide-react';

// Step 2: the /agency URL is preserved — it now means "Growth or
// Enterprise" (the new agency-equivalent tier — multi-site dashboard,
// white-label, VPAT). isAgency from useSubscription is aliased to
// planId === 'growth' || planId === 'enterprise', which is what the
// page already relied on semantically.
export default function AgencyPage() {
  const { isAgency } = useSubscription();

  if (!isAgency) {
    return (
      <div className="glass-panel rounded-2xl p-10 glow-border text-center">
        <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-foreground mb-2">Growth or Enterprise Plan Required</h2>
        <p className="text-muted-foreground mb-4">
          The multi-site agency dashboard is available on the Growth plan ($89/mo)
          or Enterprise ($175/mo). Manage all your client sites from one
          dashboard, with white-labeled PDFs and VPAT generation.
        </p>
        <Link
          href="/pricing"
          className="inline-block px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium btn-magnetic shadow-lg shadow-primary/20"
        >
          View Plans
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Agency Dashboard</h1>
        <p className="text-text-secondary text-sm mt-1">
          Multi-site overview and bulk management for your client sites.
        </p>
      </div>

      <div className="glass-panel rounded-2xl p-10 glow-border text-center">
        <Building2 className="w-12 h-12 text-primary mx-auto mb-4" />
        <h3 className="font-semibold text-foreground mb-2">Agency Dashboard Active</h3>
        <p className="text-muted-foreground text-sm mb-4">
          Your plan gives you bulk scanning, white-labeled PDF reports, multi-site
          management, and VPAT generation. Add monitored sites from the
          Monitoring page to see them here.
        </p>
        <Link
          href="/monitoring"
          className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
        >
          Go to Monitoring <ExternalLink className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}