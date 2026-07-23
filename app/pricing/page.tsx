'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, ArrowRight, Sparkles, Zap, Building2, Send } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { PLANS } from '@/lib/dodo/plans';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

// Only show paid plans on the pricing page (Free plan removed per user request)
const PAID_PLANS = Object.values(PLANS).filter(p => p.id !== 'free');

const planIcons: Record<string, typeof Sparkles> = {
  starter: Zap,
  growth: Building2,
  enterprise: Send,
};

export default function PricingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleSelect = async (planId: string) => {
    const bp = isAnnual ? 'annual' : 'monthly';

    if (user) {
      setLoading(planId);
      try {
        const res = await fetch('/api/dodo/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan: planId, billingPeriod: bp }),
        });
        if (res.ok) {
          const { url } = await res.json();
          window.location.href = url;
        }
      } catch (err) {
        console.error(err);
      }
      setLoading(null);
    } else {
      router.push(`/signup?plan=${planId}&billing=${bp}`);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-6"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Simple Pricing
            </motion.span>
            <h1 className="text-4xl sm:text-5xl font-bold mb-4 text-foreground">
              Choose your <span className="gradient-text">plan</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              Start with a plan that fits your needs. Upgrade anytime as your team grows.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="flex items-center justify-center gap-4 mb-14"
          >
            <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>Monthly</span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative w-14 h-7 rounded-full bg-slate-300 dark:bg-slate-700 border border-slate-400 dark:border-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
              aria-label="Toggle annual billing"
            >
              <motion.span
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md border border-slate-200"
                animate={{ x: isAnnual ? 28 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
              Annual
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/20">
                2 Months Free
              </span>
            </span>
          </motion.div>

          {/* Pricing Cards — 3-column grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-start">
            {PAID_PLANS.map((plan, i) => {
              const isPopular = plan.id === 'growth';
              const Icon = planIcons[plan.id] || Sparkles;
              const displayPrice = isAnnual ? plan.annualPrice : plan.price;
              const savingsPercent = plan.price > 0
                ? Math.round((1 - plan.annualPrice / (plan.price * 12)) * 100)
                : 0;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.12, duration: 0.5, ease: 'easeOut' }}
                  whileHover={{ y: -6, transition: { duration: 0.25 } }}
                  className={`relative ${isPopular ? 'lg:-mt-4 lg:mb-4' : ''}`}
                >
                  {isPopular && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.6 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 z-20"
                    >
                      <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-lg shadow-primary/30">
                        <Zap className="w-3 h-3" />
                        Most Popular
                      </span>
                    </motion.div>
                  )}

                  <div className={`relative glass-panel rounded-3xl p-8 flex flex-col glow-border h-full ${
                    isPopular
                      ? 'border-primary/40 shadow-2xl shadow-primary/15'
                      : 'border-border/50 hover:border-primary/20'
                  } transition-all duration-300`}>
                    {/* Gradient background */}
                    <div className={`absolute inset-0 rounded-3xl bg-gradient-to-br ${
                      isPopular ? 'from-primary/8 to-violet-500/8' : 'from-transparent to-transparent'
                    } pointer-events-none`} />

                    <div className="relative z-10">
                      {/* Icon + Name */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${
                          isPopular
                            ? 'bg-primary/15 border border-primary/25'
                            : 'bg-secondary/50 border border-border/50'
                        }`}>
                          <Icon className={`w-5 h-5 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-6">
                        <div className="flex items-baseline gap-1">
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={`${plan.id}-${isAnnual ? 'annual' : 'monthly'}`}
                              initial={{ y: 12, opacity: 0 }}
                              animate={{ y: 0, opacity: 1 }}
                              exit={{ y: -12, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="text-5xl font-extrabold text-foreground"
                            >
                              ${displayPrice}
                            </motion.span>
                          </AnimatePresence>
                          <span className="text-muted-foreground text-sm">/{isAnnual ? 'year' : 'mo'}</span>
                        </div>
                        {isAnnual && savingsPercent > 0 && (
                          <p className="text-emerald-400 text-xs font-medium mt-1">
                            Save {savingsPercent}% vs monthly (${plan.price * 12}/year)
                          </p>
                        )}
                        {!isAnnual && (
                          <p className="text-muted-foreground text-xs mt-1">
                            ${plan.annualPrice}/year when billed annually
                          </p>
                        )}
                      </div>

                      {/* Divider */}
                      <div className="section-divider mb-6" />

                      {/* Features */}
                      <ul className="space-y-3 mb-8 flex-1">
                        {plan.features.map((f, fi) => (
                          <motion.li
                            key={fi}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 + i * 0.1 + fi * 0.03 }}
                            className="flex items-start gap-2.5 text-sm"
                          >
                            <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPopular ? 'text-primary' : 'text-muted-foreground'}`} />
                            <span className="text-muted-foreground">{f}</span>
                          </motion.li>
                        ))}
                      </ul>

                      {/* CTA */}
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleSelect(plan.id)}
                        disabled={loading === plan.id}
                        className={`w-full px-6 py-3.5 rounded-xl font-semibold transition-all text-center disabled:opacity-50 disabled:cursor-wait ${
                          isPopular
                            ? 'bg-primary hover:opacity-90 text-primary-foreground btn-magnetic shadow-lg shadow-primary/25'
                            : 'border border-border hover:border-primary/50 text-foreground hover:bg-secondary/50'
                        }`}
                      >
                        {loading === plan.id ? (
                          <span className="inline-flex items-center gap-2">
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block"
                            />
                            Processing...
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2">
                            {plan.id === 'enterprise' ? 'Contact Sales' : `Start ${plan.name} Trial`}
                            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                          </span>
                        )}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Comparison link */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center mt-10"
          >
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              See how we compare to other tools
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </motion.div>

          {/* Feature Comparison Table */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.6 }}
            className="mt-24 max-w-4xl mx-auto"
          >
            <h2 className="text-2xl font-bold text-center mb-8 text-foreground">Full Feature Comparison</h2>
            <div className="glass-panel rounded-2xl overflow-hidden glow-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-semibold w-[280px]">Feature</th>
                      <th className="text-center p-4 text-sm font-semibold">Starter</th>
                      <th className="text-center p-4 text-sm font-semibold bg-primary/5">Growth</th>
                      <th className="text-center p-4 text-sm font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      ['Monthly scans', '75', '250', '500'],
                      ['Page renders/mo', '120', '600', '2,500'],
                      ['Multi-page scan cap', '15 pages', '15 pages', '15 pages'],
                      ['Monitored sites', '5', '15', '25'],
                      ['Seats', '1', '5', 'Unlimited'],
                      ['Scan history', '30 days', '90 days', '1 year'],
                      ['PDF reports', <Check key="p1" className="w-4 h-4 text-success inline" />, <Check key="p2" className="w-4 h-4 text-success inline" />, <Check key="p3" className="w-4 h-4 text-success inline" />],
                      ['AI-powered fixes', '25/mo', '150/mo', '500/mo'],
                      ['API access (CI/CD)', '—', '—', <Check key="a1" className="w-4 h-4 text-success inline" />],
                      ['Agency dashboard', '—', <Check key="d1" className="w-4 h-4 text-success inline" />, <Check key="d2" className="w-4 h-4 text-success inline" />],
                      ['White-label PDFs', '—', <Check key="w1" className="w-4 h-4 text-success inline" />, <Check key="w2" className="w-4 h-4 text-success inline" />],
                      ['VPAT & ACR generation', '—', <Check key="v1" className="w-4 h-4 text-success inline" />, <Check key="v2" className="w-4 h-4 text-success inline" />],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0 hover:bg-secondary/20 transition-colors">
                        <td className="p-4 text-text-secondary">{row[0]}</td>
                        <td className="p-4 text-center">{row[1]}</td>
                        <td className="p-4 text-center bg-primary/5">{row[2]}</td>
                        <td className="p-4 text-center">{row[3]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
