import { cn } from '@/lib/utils';

interface Props {
  plan: string;
  className?: string;
}

export default function SubscriptionBadge({ plan, className }: Props) {
  // Step 2: tier names changed (free/starter/growth/enterprise). Old
  // pro/agency keys intentionally dropped so a legacy webhook payload
  // doesn't accidentally re-render the old badge styles — they'll fall
  // through to the free-style default.
  const styles: Record<string, string> = {
    free: 'bg-surface-elevated text-text-secondary',
    starter: 'bg-primary/20 text-primary',
    growth: 'bg-accent/20 text-accent',
    enterprise: 'bg-amber-500/20 text-amber-400',
  };

  const displayLabel: Record<string, string> = {
    free: 'Free',
    starter: 'Starter',
    growth: 'Growth',
    enterprise: 'Enterprise',
  };

  return (
    <span
      className={cn(
        'px-2.5 py-0.5 rounded-full text-xs font-semibold',
        styles[plan] || styles.free,
        className
      )}
    >
      {displayLabel[plan] || (plan.charAt(0).toUpperCase() + plan.slice(1))}
    </span>
  );
}
