import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | WCAG Scanner',
  description: 'How WCAG Scanner collects, uses, and protects your data. Read our full privacy policy for details on scans, accounts, and emails.',
  openGraph: {
    title: 'Privacy Policy | WCAG Scanner',
    description: 'How WCAG Scanner collects, uses, and protects your data. Read our full privacy policy for details on scans, accounts, and emails.',
    url: 'https://www.wcagscannerr.com/privacy-policy',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function PrivacyPolicyPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <LegalPageLayout
          title="Privacy Policy"
          subtitle="We respect your privacy. Here is exactly what data we collect and why."
          lastUpdated="January 2025"
        >
          <div className="warning-box mb-6">
            <p className="text-sm">
              This document was last updated on January 1, 2025. Please read it carefully before using the service.
            </p>
          </div>

          <h2 id="information-we-collect">1. Information We Collect</h2>
          <p>
            <strong>Account data:</strong> When you sign up, we collect your email address and name. This is necessary to create and manage your account.
          </p>
          <p>
            <strong>Scan data:</strong> The URLs you submit for scanning are stored so you can access your scan history and re-run scans. We do not store the content of scanned pages beyond the violation data.
          </p>
          <p>
            <strong>Payment data:</strong> All payments are handled entirely by Stripe. We never see, store, or have access to your credit card number. Your payment information is subject to Stripe&apos;s privacy policy.
          </p>
          <p>
            <strong>Usage data:</strong> We track basic usage (pages visited, features used) to improve the product. This is anonymous and not tied to any identifying information beyond your account.
          </p>
          <p>
            <strong>Cookies:</strong> We use only essential session cookies required for login to work. We do not use tracking cookies, advertising cookies, or analytics cookies from third parties.
          </p>

          <h2 id="how-we-use-data">2. How We Use Your Information</h2>
          <ul>
            <li>To provide and operate the scanning service.</li>
            <li>To send you scan results and monitoring alerts (if enabled).</li>
            <li>To process payments via Stripe.</li>
            <li>To respond to support requests.</li>
            <li><strong>We do NOT sell your data to any third party. Ever.</strong></li>
          </ul>

          <h2 id="data-storage">3. Data Storage & Security</h2>
          <p>
            All data is stored in Supabase, hosted on AWS infrastructure that is SOC2 compliant. Passwords are hashed using bcrypt — we cannot see them. Scan URLs are stored with Row-Level Security enabled, meaning you can only access your own data.
          </p>

          <h2 id="your-rights">4. Your Rights (GDPR & CCPA)</h2>
          <ul>
            <li><strong>Right to access:</strong> Email us at reports@wcagscannerr.com and we&apos;ll send you all your data within 30 days.</li>
            <li><strong>Right to deletion:</strong> Email us and we&apos;ll delete your account and all associated data within 7 days.</li>
            <li><strong>Right to correction:</strong> Update your profile information anytime in the Settings page.</li>
            <li><strong>Right to portability:</strong> Request a CSV export of your scan history.</li>
          </ul>

          <h2 id="cookies">5. Cookies</h2>
          <p>
            We use only essential session cookies — no tracking cookies, no analytics cookies, no third-party advertising cookies.
          </p>

          <h2 id="third-party">6. Third-Party Services</h2>
          <ul>
            <li><strong>Stripe</strong> (payment processing) — see stripe.com/privacy</li>
            <li><strong>Supabase</strong> (database hosting) — see supabase.com/privacy</li>
            <li><strong>Vercel</strong> (website hosting) — see vercel.com/legal/privacy-policy</li>
          </ul>

          <h2 id="children">7. Children&apos;s Privacy</h2>
          <p>
            This service is not directed at anyone under 18 years old. We do not knowingly collect data from children.
          </p>

          <h2 id="changes">8. Changes to This Policy</h2>
          <p>
            We will email registered users at least 14 days before any material changes to this policy.
          </p>

          <h2 id="contact">9. Contact Us</h2>
          <p>
            Email: <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>
          </p>
        </LegalPageLayout>
      </div>
      <Footer />
    </>
  );
}