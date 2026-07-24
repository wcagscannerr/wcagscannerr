import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | WCAG Scanner',
  description: 'The terms of service governing your use of WCAG Scanner accessibility scanning, monitoring, and compliance tools.',
  openGraph: {
    title: 'Terms of Service | WCAG Scanner',
    description: 'The terms of service governing your use of WCAG Scanner accessibility scanning, monitoring, and compliance tools.',
    url: 'https://www.wcagscannerr.com/terms-of-service',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <LegalPageLayout
          title="Terms of Service"
          subtitle="By using this service, you agree to these terms. Please read them."
          lastUpdated="January 2025"
        >
          <div className="warning-box mb-6">
            <p className="text-sm">
              This document was last updated on January 1, 2025. Please read it carefully before using the service.
            </p>
          </div>

          <h2 id="acceptance">1. Acceptance of Terms</h2>
          <p>
            By creating an account or using the free scanner, you agree to these terms. If you do not agree, do not use the service.
          </p>

          <h2 id="description">2. Description of Service</h2>
          <p>
            WCAG Scanner provides automated WCAG accessibility scanning for websites. We use the open-source axe-core engine to detect common accessibility violations. Our automated scans detect approximately 57% of WCAG issues — not all issues. Results are for informational purposes only.
          </p>

          <h2 id="disclaimer">3. ⚠️ Critical Disclaimer — Automated Scanning Limitations</h2>
          <div className="warning-box my-4">
            <ul className="space-y-2">
              <li>Our tool provides AUTOMATED scanning only. Results do NOT constitute legal advice.</li>
              <li>We CANNOT and DO NOT guarantee that your website is fully WCAG or ADA compliant.</li>
              <li>A passing score on our tool does not protect you from legal action.</li>
              <li>For full legal compliance, consult a qualified accessibility expert and attorney.</li>
              <li>We are not liable for any lawsuits, fines, or damages arising from your use of scan results.</li>
            </ul>
          </div>

          <h2 id="acceptable-use">4. Acceptable Use</h2>
          <ul>
            <li>You may only scan websites you own or have explicit written permission to scan.</li>
            <li>You may not use this service to scan competitor websites for malicious purposes.</li>
            <li>You may not attempt to overload or attack the scanning infrastructure.</li>
            <li>You may not resell access to the service without a written agency agreement.</li>
            <li>Violation of these rules results in immediate account termination without refund.</li>
          </ul>

          <h2 id="billing">5. Subscription and Billing</h2>
          <p>
            Subscriptions are billed monthly or annually via Stripe. Your subscription auto-renews unless cancelled before the renewal date. You can cancel anytime from the Billing page — cancellation takes effect at period end. Downgrading to Free does not delete your data.
          </p>

          <h2 id="refund">6. Refund Policy</h2>
          <p>
            We offer a 7-day refund for first-time subscribers who are not satisfied. Refunds are not available after 7 days or for subsequent billing cycles. To request a refund, email reports@wcagscannerr.com within 7 days of charge.
          </p>

          <h2 id="ip">7. Intellectual Property</h2>
          <p>
            The software, design, and content of this service are owned by WCAG Scanner. axe-core is used under the Mozilla Public License 2.0 (open source). You retain full ownership of all websites and content you scan.
          </p>

          <h2 id="liability">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, our total liability to you shall not exceed the amount you paid us in the 3 months preceding the claim. We are not liable for indirect, incidental, or consequential damages. We are not liable for any losses from relying on scan results.
          </p>

          <h2 id="termination">9. Termination</h2>
          <p>
            We may suspend accounts that violate these terms. You may delete your account at any time from Settings.
          </p>

          <h2 id="governing-law">10. Governing Law</h2>
          <p>
            These terms are governed by the laws of the State of Delaware, USA. Disputes shall be resolved by binding arbitration, not class action lawsuits.
          </p>

          <h2 id="contact-tos">11. Contact</h2>
          <p>
            Email: <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>
          </p>
        </LegalPageLayout>
      </div>
      <Footer />
    </>
  );
}