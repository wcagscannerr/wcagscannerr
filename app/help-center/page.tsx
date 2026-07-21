import Link from 'next/link';
import { Metadata } from 'next';
import { ArrowLeft, Search, Zap, ShieldCheck, CreditCard, Lock, MessageCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: 'Help Center | WCAG Scanner',
  description: 'Answers to common questions about WCAG Scanner before you sign up — pricing, how scanning works, data privacy, and getting started.',
  openGraph: {
    title: 'Help Center | WCAG Scanner',
    description: 'Answers to common questions about WCAG Scanner before you sign up — pricing, how scanning works, data privacy, and getting started.',
    url: 'https://www.wcagscannerr.com/help-center',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

const faqItems = [
  {
    q: 'Is the free scan actually free?',
    a: 'Yes. Enter any URL on the Free Scan page and get a real compliance score with your top violations, no account or card required. Free accounts get 5 full scans per month if you sign up.',
  },
  {
    q: "What's the difference between this and an accessibility overlay widget?",
    a: "Overlay widgets (AccessiBe, UserWay, and similar) sit on top of your site and claim to auto-fix issues with JavaScript. They don't actually fix the underlying code, and multiple lawsuits have specifically targeted sites using them. WCAG Scanner finds real issues in your actual HTML/CSS so you or your developer can fix them properly — we'll flag it in your report if we detect you're using one.",
  },
  {
    q: 'Do I need the paid plan, or is free enough?',
    a: "If you just want to check a site occasionally, Free covers that. If you're actively fixing issues, need to scan multiple pages, want ongoing monitoring, or need PDF reports for a client or legal record, Pro or Agency is worth it. See the full comparison on the Pricing page.",
  },
  {
    q: 'Will this make my site 100% legally compliant?',
    a: 'No automated tool can guarantee that, and any tool claiming otherwise isn\'t being straight with you. Automated scanning catches roughly half of all WCAG success criteria — the rest (things like whether alt text is actually meaningful, or keyboard navigation flows logically) need human review. We flag which issues need manual checking. This is not legal advice.',
  },
  {
    q: 'Do you store or share the content of the sites I scan?',
    a: "We store your scan results (scores, violations found, and a screenshot for Pro/Agency plans) so you can view your report history. We don't sell or share this data with third parties. See our Privacy Policy for full details.",
  },
  {
    q: "What if I'm not a developer?",
    a: 'Every violation in your report comes with a plain-language explanation and a specific fix suggestion. Pro and Agency plans also include an AI assistant that can explain issues and suggest fixes for common platforms like WordPress and Shopify.',
  },
  {
    q: "I already have an account — where's help for using the dashboard?",
    a: 'Log in and visit Help from your dashboard sidebar for in-depth guides on scoring, monitoring setup, and report exports.',
  },
];

const quickLinks = [
  { icon: Zap, label: 'Run a free scan', href: '/free-scan', description: 'No signup needed' },
  { icon: CreditCard, label: 'Compare plans', href: '/pricing', description: 'Find the right tier' },
  { icon: ShieldCheck, label: 'See a sample report', href: '/sample-report', description: 'What you actually get' },
  { icon: Lock, label: 'Privacy Policy', href: '/privacy-policy', description: 'How we handle your data' },
];

export default function HelpCenterPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4">
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <div className="text-center mb-12">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium tracking-wide mb-4">
              <Search className="w-3.5 h-3.5" /> Help Center
            </span>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
              Questions, <span className="gradient-text">answered</span>
            </h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Everything you'd want to know before scanning your first site or picking a plan.
              Already a customer? Log in for in-depth product docs.
            </p>
          </div>

          {/* Quick links */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-14">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="glass-panel rounded-xl p-4 glow-border hover:border-primary/30 transition-colors"
              >
                <link.icon className="w-4 h-4 text-primary mb-2" />
                <p className="text-sm font-medium text-foreground">{link.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{link.description}</p>
              </Link>
            ))}
          </div>

          {/* FAQ */}
          <div className="space-y-2 mb-14">
            {faqItems.map((item, i) => (
              <details key={i} className="glass-panel rounded-xl group glow-border">
                <summary className="px-5 py-4 text-sm font-medium text-foreground cursor-pointer hover:text-primary transition-colors list-none flex items-center justify-between gap-4">
                  {item.q}
                  <span className="text-muted-foreground group-open:rotate-180 transition-transform shrink-0">▼</span>
                </summary>
                <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>

          {/* Contact */}
          <div className="glass-panel rounded-2xl p-8 glow-border text-center">
            <MessageCircle className="w-6 h-6 text-primary mx-auto mb-3" />
            <p className="text-foreground font-medium mb-1">Still have a question?</p>
            <p className="text-sm text-muted-foreground mb-4">
              Email us at{' '}
              <a href="mailto:reports@wcagscannerr.com" className="text-primary hover:text-primary/80">
                reports@wcagscannerr.com
              </a>{' '}
              — we typically respond within 24 hours on business days.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground btn-magnetic"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}