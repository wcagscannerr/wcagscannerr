'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { Check, Zap, Building2, ArrowRight, Sparkles, Loader2, Rocket } from 'lucide-react';
import { useState } from 'react';
import { useUser } from '@/hooks/useUser';
import { toast } from 'sonner';

type PlanTile = {
  id: 'free' | 'starter' | 'growth' | 'enterprise';
  name: string;
  description: string;
  prices: { monthly: number; annually: number };
  icon: typeof Sparkles;
  features: string[];
  cta: string;
  popular: boolean;
  gradient: string;
  glowColor: string;
};

// Step 2: 4-tier billing layout. Quotas mirror lib/dodo/plans.ts.
// Most Popular is on Growth per the spec — white-label + VPAT is the
// highest-intent upsell.
const plans: PlanTile[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individuals getting started',
    prices: { monthly: 0, annually: 0 },
    icon: Sparkles,
    features: [
      '3 scans per month',
      '3 page renders per month',
      '1 page per scan',
      'Basic violation report',
      'CSV export',
      'WCAG 2.1 scanning',
      'Community support',
    ],
    cta: 'Get Started',
    popular: false,
    gradient: 'from-slate-500/10 to-gray-500/10',
    glowColor: 'hover:shadow-slate-500/10',
  },
  {
    id: 'starter',
    name: 'Starter',
    description: 'For professionals & small teams',
    prices: { monthly: 29, annually: 290 },
    icon: Zap,
    features: [
      '75 scans per month',
      '120 page renders per month',
      'Single-page scans up to 15 pages',
      'Multi-page scan (up to 15 pages)',
      'PDF compliance reports',
      'Monitor 5 sites',
      'AI-powered fixes (25/mo)',
      'Email alerts',
      'Priority support',
    ],
    cta: 'Start Starter Trial',
    popular: false,
    gradient: 'from-primary/15 to-violet-500/15',
    glowColor: 'hover:shadow-primary/15',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For agencies & multi-site teams',
    prices: { monthly: 89, annually: 890 },
    icon: Building2,
    features: [
      '250 scans per month',
      '600 page renders per month',
      'Multi-page scan (up to 25 pages)',
      'Multi-site agency dashboard',
      'White-labeled PDF reports',
      'Monitor 15 sites',
      '5 seats',
      'AI-powered fixes (150/mo)',
      'Email alerts',
      'VPAT & ACR generation',
    ],
    cta: 'Start Growth Trial',
    popular: true, // ≤ Step 2 spec: badge sits on Growth
    gradient: 'from-primary/20 to-violet-500/20',
    glowColor: 'hover:shadow-primary/20',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large orgs and CI/CD workflows',
    prices: { monthly: 175, annually: 1750 },
    icon: Rocket,
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
      'Dedicated support',
    ],
    cta: 'Contact Sales',
    popular: false,
    gradient: 'from-amber-500/10 to-orange-500/10',
    glowColor: 'hover:shadow-amber-500/10',
  },
];

export default function Pricing() {
  const [isAnnual, setIsAnnual] = useState(false);
  const { user, loading } = useUser();
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const isSignedIn = !loading && !!user;

  async function handleCtaClick(planId: string) {
    if (pendingPlan) return;
    const billingPeriod = isAnnual ? 'annual' : 'monthly';

    if (planId === 'free') {
      window.location.href = `/signup?plan=${planId}&billing=${billingPeriod}`;
      return;
    }

    if (isSignedIn) {
      setPendingPlan(planId);
      try {
        const response = await fetch('/api/dodo/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, billingPeriod }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Checkout failed');
        }
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error('No payment link returned');
        }
      } catch (err: any) {
        console.error('Checkout error:', err);
        toast.error(err.message || 'Failed to start checkout. Please try again.');
        window.location.href = '/billing';
      } finally {
        setPendingPlan(null);
      }
    } else {
      window.location.href = `/signup?plan=${planId}&billing=${billingPeriod}`;
    }
  }

  return (
    <section className="relative py-24 lg:py-32 bg-background overflow-hidden">
      <div className="absolute top-0 left-1/4 w-[400px] h-[400px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel rounded-3xl p-8 lg:p-10 glow-border mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center max-w-2xl mx-auto mb-12"
          >
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-4">
              <Sparkles className="w-3.5 h-3.5" /> Simple Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Choose your <span className="gradient-text">plan</span>
            </h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you need more power. No hidden fees.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="flex items-center justify-center gap-4 mb-12"
          >
            <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-12 h-6 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 transition-colors focus:outline-none"
              aria-label="Toggle annual billing"
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md border border-slate-200 transition-transform duration-300 ease-out ${isAnnual ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
              <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">2 Months Free</span>
            </span>
          </motion.div>
        </div>

        {/* Pricing Cards */}
        {/* Step 2: lg:grid-cols-3 → lg:grid-cols-4 to fit Starter/Growth/Enterprise */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-7 items-start">
          {plans.map((plan) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: plans.indexOf(plan) * 0.08 }}
              className={`relative rounded-2xl ${plan.popular ? 'lg:-mt-4 lg:mb-4' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/25">
                    <Zap className="w-3 h-3" /> Most Popular
                  </span>
                </div>
              )}

              <div className={`relative h-full glass-panel rounded-2xl p-6 lg:p-7 glow-border ${plan.glowColor} ${plan.popular ? 'border-primary/40 shadow-xl shadow-primary/10' : ''}`}>
                <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${plan.gradient} opacity-50 pointer-events-none`} />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.gradient} border border-white/10 flex items-center justify-center`}>
                      <plan.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                      <p className="text-xs text-muted-foreground">{plan.description}</p>
                    </div>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1 h-10 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={`${plan.id}-${isAnnual ? 'annual' : 'monthly'}`}
                          initial={{ y: 16, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -16, opacity: 0 }}
                          transition={{ duration: 0.25, ease: 'easeOut' }}
                          className="text-4xl font-bold text-foreground"
                        >
                          ${isAnnual ? plan.prices.annually : plan.prices.monthly}
                        </motion.span>
                      </AnimatePresence>
                      <span className="text-muted-foreground">/{isAnnual ? 'year' : 'mo'}</span>
                    </div>
                    {plan.prices.monthly > 0 && (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${plan.id}-${isAnnual ? 'annual-note' : 'monthly-note'}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-1"
                        >
                          <p className={`text-xs ${isAnnual ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                            {isAnnual
                              ? `Billed annually ($${plan.prices.annually}/year) · 2 months free`
                              : 'Billed monthly'}
                          </p>
                          {/* Step 2: free-trial note applies to any paid tier,
                              not just the legacy pro/agency. */}
                          {!isAnnual && plan.id !== 'free' && (
                            <p className="text-xs text-primary font-medium">
                              5-day free trial included
                            </p>
                          )}
                        </motion.div>
                      </AnimatePresence>
                    )}
                  </div>

                  <button
                    onClick={() => handleCtaClick(plan.id)}
                    disabled={pendingPlan === plan.id}
                    className={`group flex items-center justify-center gap-2 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-300 mb-6 ${
                      plan.popular
                        ? 'bg-primary text-primary-foreground btn-magnetic'
                        : 'border border-border hover:bg-secondary text-foreground'
                    } disabled:opacity-50 disabled:cursor-wait`}
                  >
                    {pendingPlan === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        {plan.cta}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </button>

                  <div className="section-divider mb-6" />

                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-3">
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${plan.popular ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className="text-sm text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
