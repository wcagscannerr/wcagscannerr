'use client';

import { Check } from 'lucide-react';
import type { Plan } from '@/types/user';
import { cn } from '@/lib/utils';

interface Props {
  plan: Plan;
  isPopular?: boolean;
  onSelect: (planId: string, billingPeriod?: 'monthly' | 'annual') => void;
  loading?: boolean;
  currentPlan?: boolean;
  isAnnual?: boolean;
}

export default function PricingCard({ plan, isPopular, onSelect, loading, currentPlan, isAnnual }: Props) {
  const displayPrice = isAnnual ? plan.annualPrice : plan.price
  const savingsPercent = plan.price > 0
    ? Math.round((1 - plan.annualPrice / (plan.price * 12)) * 100)
    : 0

  return (
    <div
      className={cn(
        'relative glass-panel rounded-2xl p-6 lg:p-8 flex flex-col glow-border',
        isPopular ? 'border-primary/40 shadow-xl shadow-primary/10' : 'border-border/50'
      )}
    >
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full shadow-lg shadow-primary/20">
          Most Popular
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
        <div className="mt-2">
          <span className="text-4xl font-extrabold text-foreground">
            {displayPrice === 0 ? 'Free' : `$${displayPrice}`}
          </span>
          {displayPrice > 0 && (
            <span className="text-muted-foreground text-sm">
              /{isAnnual ? 'year' : 'mo'}
            </span>
          )}
        </div>
        {displayPrice > 0 && (
          <div className="space-y-1 mt-1">
            {isAnnual ? (
              <p className="text-emerald-400 text-xs font-medium">
                ${plan.annualPrice}/year — save {savingsPercent}%
              </p>
            ) : (
              <p className="text-muted-foreground text-xs">
                ${plan.annualPrice}/year when billed annually
              </p>
            )}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <span className="text-muted-foreground">{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={() => onSelect(plan.id, isAnnual ? 'annual' : 'monthly')}
        disabled={loading || currentPlan}
        className={cn(
          'w-full px-6 py-3 rounded-xl font-semibold transition-colors text-center',
          currentPlan
            ? 'bg-emerald-500/10 text-emerald-400 cursor-default'
            : isPopular
              ? 'bg-primary hover:opacity-90 text-primary-foreground btn-magnetic shadow-lg shadow-primary/20'
              : 'border border-border hover:border-primary/50 text-foreground hover:bg-secondary/50'
        )}
      >
        {currentPlan ? 'Current Plan' : displayPrice === 0 ? 'Get Started' : 'Subscribe'}
      </button>
    </div>
  );
}