'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CreditCard, Check, CheckCircle, Calendar } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';

export default function BillingPage() {
  const { plan, isPaid, limits } = useSubscription();
  const searchParams = useSearchParams();
  const success = searchParams?.get('success');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);

  // Fetch latest profile data (especially after returning from Stripe)
  useEffect(() => {
    fetch('/api/user')
      .then((r) => r.json())
      .then((d) => setProfile(d.profile))
      .catch(() => {});
  }, []);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/dodo/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open subscription portal');
      }
    } catch {
      alert('Error opening subscription portal.');
    }
    setLoading(false);
  };

  const handleUpgrade = async (planId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/dodo/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      }
    } catch {
      alert('Error starting checkout.');
    }
    setLoading(false);
  };

  const renewalDate = profile?.current_period_end
    ? new Date(profile.current_period_end).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-text-secondary text-sm mt-1">
          Manage your subscription and billing details.
        </p>
      </div>

      {/* Success banner */}
      {success === 'true' && (
        <div className="bg-success/10 border border-success/30 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <p className="font-semibold text-success">Payment Successful!</p>
            <p className="text-text-secondary text-sm">
              Your plan has been upgraded. It may take a moment to reflect below.
              Refresh this page if you don't see the update.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="glass-panel rounded-2xl p-6 glow-border">
  <div className="flex items-center justify-between mb-4">
    <h2 className="font-semibold text-foreground">Current Plan</h2>
    <span className="badge-glow badge-glow-success capitalize">
      {profile?.subscription_status || plan.name}
    </span>
  </div>

  {renewalDate && (
    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
      <Calendar className="w-4 h-4" />
      <span>Renews on {renewalDate}</span>
    </div>
  )}

  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
    <div className="glass-panel rounded-lg p-3">
      <p className="text-xs text-muted-foreground">Scans/Month</p>
      <p className="font-bold text-foreground">{limits.scansPerMonth}</p>
    </div>
    <div className="glass-panel rounded-lg p-3">
      <p className="text-xs text-muted-foreground">Pages/Scan</p>
      <p className="font-bold text-foreground">{limits.pagesPerScan}</p>
    </div>
    <div className="glass-panel rounded-lg p-3">
      <p className="text-xs text-muted-foreground">Monitored Sites</p>
      <p className="font-bold text-foreground">{limits.monitoredSites}</p>
    </div>
    <div className="glass-panel rounded-lg p-3">
      <p className="text-xs text-muted-foreground">History</p>
      <p className="font-bold text-foreground">{limits.historyDays} days</p>
    </div>
  </div>

  <div className="flex gap-3">
    {isPaid ? (
      <button
        onClick={handleManageSubscription}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-sm font-medium btn-magnetic shadow-lg shadow-primary/20"
      >
        <CreditCard className="w-4 h-4" />
        {loading ? 'Loading...' : 'Manage Subscription'}
      </button>
    ) : (
      <button
        onClick={() => handleUpgrade('starter')}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:opacity-50 text-primary-foreground rounded-xl text-sm font-medium btn-magnetic shadow-lg shadow-primary/20"
      >
        <CreditCard className="w-4 h-4" />
        {loading ? 'Loading...' : 'Upgrade to Starter'}
      </button>
    )}
    <Link
      href="/pricing"
      className="flex items-center gap-2 px-4 py-2 border border-border hover:border-primary/30 rounded-xl text-sm transition-colors"
    >
      Compare Plans
    </Link>
  </div>
</div>

      {/* Features */}
      <div className="bg-surface border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Your Plan Features</h2>
        <div className="grid sm:grid-cols-2 gap-2">
          {plan.features.map((f: string, i: number) => (
            <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
              <Check className="w-4 h-4 text-success flex-shrink-0" />
              {f}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}