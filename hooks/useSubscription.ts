'use client';

import { useState, useEffect } from 'react';
import { PLANS, getPlanLimits } from '@/lib/dodo/plans';
import type { PlanLimits } from '@/types/user';

export function useSubscription() {
  const [planId, setPlanId] = useState<string>('free');
  const [limits, setLimits] = useState<PlanLimits>(PLANS.free.limits);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const res = await fetch('/api/user');
        if (res.ok) {
          const data = await res.json();
          const status = data.profile?.subscription_status || 'free';
          setPlanId(status);
          setLimits(getPlanLimits(status));
        }
      } catch {
        // Default to free
      } finally {
        setLoading(false);
      }
    };

    fetchSubscription();
  }, []);

  const plan = PLANS[planId] || PLANS.free;

  return {
    planId,
    plan,
    limits,
    loading,
    // New tier flags (preferred).
    isStarter: planId === 'starter',
    isGrowth: planId === 'growth',
    isEnterprise: planId === 'enterprise',
    isFree: planId === 'free',
    isPaid:
      planId === 'starter' || planId === 'growth' || planId === 'enterprise',
    // Legacy semantic aliases — kept so we don't have to rewrite every
    // dashboard page in lockstep with the rename. UI code that uses these
    // is reading "is the user on the old Pro mid-tier" or "on the old
    // agency / current Growth-or-higher tier".
    isPro: planId === 'starter',
    isAgency: planId === 'growth' || planId === 'enterprise',
  };
}
