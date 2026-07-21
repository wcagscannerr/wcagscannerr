'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@/hooks/useUser';
import { PLANS } from '@/lib/dodo/plans';
import PricingCard from '@/components/billing/PricingCard';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export default function PricingPage() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);

  const handleSelect = async (planId: string, billingPeriod?: 'monthly' | 'annual') => {
    if (planId === 'free') {
      if (user) {
        router.push('/dashboard');
      } else {
        router.push('/signup?plan=free');
      }
      return;
    }

    const bp = billingPeriod || 'monthly';

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
      // Unauthenticated: go to signup with plan + billing info
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-4xl font-bold mb-4 text-foreground">
              Simple, <span className="gradient-text">Transparent</span> Pricing
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free. Upgrade when you need more scans, monitoring, and professional reports.
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
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
          </motion.div>            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {Object.values(PLANS).map((plan, i) => {
              // Step 2: Most Popular sits on Growth (white-label + VPAT
              // is the highest-intent upsell) rather than the prior Pro tier.
              const isPopular = plan.id === 'growth';
              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.15 }}
                >
                  <PricingCard
                    plan={plan}
                    isPopular={isPopular}
                    onSelect={handleSelect}
                    loading={loading === plan.id}
                    isAnnual={isAnnual}
                  />
                </motion.div>
              );
            })}
          </div>

          {/* Comparison link */}
          <div className="text-center mt-8">
            <Link
              href="/compare"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              See how we compare to other tools
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Feature comparison */}
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold text-center mb-8 text-foreground">Full Feature Comparison</h2>
            <div className="glass-panel rounded-2xl overflow-hidden glow-border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-4 text-sm font-semibold w-[280px]">Feature</th>
                      <th className="text-center p-4 text-sm font-semibold">Free</th>
                      <th className="text-center p-4 text-sm font-semibold">Starter</th>
                      <th className="text-center p-4 text-sm font-semibold bg-primary/5">Growth</th>
                      <th className="text-center p-4 text-sm font-semibold">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {[
                      ['Monthly scans', '3', '75', '250', '500'],
                      ['Multi-page scan cap', '1 page', '15 pages', '25 pages', '50 pages'],
                      ['Monitored sites', '0', '5', '15', '25'],
                      ['Seats', '1', '1', '5', 'Unlimited'],
                      ['Scan history', '7 days', '30 days', '90 days', '1 year'],
                      ['PDF reports', '—', <Check key="p1" className="w-4 h-4 text-success inline" />, <Check key="p2" className="w-4 h-4 text-success inline" />, <Check key="p3" className="w-4 h-4 text-success inline" />],
                      ['API access (CI/CD)', '—', '—', '—', <Check key="a1" className="w-4 h-4 text-success inline" />],
                      ['Agency dashboard', '—', '—', <Check key="d1" className="w-4 h-4 text-success inline" />, <Check key="d2" className="w-4 h-4 text-success inline" />],
                      ['White-label PDFs', '—', '—', <Check key="w1" className="w-4 h-4 text-success inline" />, <Check key="w2" className="w-4 h-4 text-success inline" />],
                      ['VPAT & ACR generation', '—', '—', <Check key="v1" className="w-4 h-4 text-success inline" />, <Check key="v2" className="w-4 h-4 text-success inline" />],
                    ].map((row, i) => (
                      <tr key={i} className="border-b border-border last:border-0">
                        <td className="p-4 text-text-secondary">{row[0]}</td>
                        <td className="p-4 text-center">{row[1]}</td>
                        <td className="p-4 text-center">{row[2]}</td>
                        <td className="p-4 text-center bg-primary/5">{row[3]}</td>
                        <td className="p-4 text-center">{row[4]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}