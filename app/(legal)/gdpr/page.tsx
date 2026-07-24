import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GDPR Compliance | WCAG Scanner',
  description: 'WCAG Scanner is GDPR-compliant. Learn how we protect your personal data and your rights under GDPR.',
  openGraph: {
    title: 'GDPR Compliance | WCAG Scanner',
    description: 'WCAG Scanner is fully GDPR-compliant. Read about your data rights and our data processing practices.',
    url: 'https://www.wcagscannerr.com/gdpr',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function GdprPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <LegalPageLayout
          title="GDPR Compliance"
          subtitle="How WCAG Scanner protects your personal data and respects your privacy rights under EU law."
          lastUpdated="July 2026"
        >
          <div className="warning-box mb-6">
            <p className="text-sm">
              This document explains how WCAG Scanner complies with the General Data Protection Regulation (GDPR) (EU) 2016/679. It applies to all users in the European Economic Area (EEA).
            </p>
          </div>

          <h2 id="controller">1. Data Controller</h2>
          <p>
            WCAG Scanner is the data controller for the personal data we collect. If you have any questions about this notice or your data rights, contact us at{' '}
            <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>.
          </p>

          <h2 id="data-we-collect">2. Personal Data We Collect</h2>
          <p>We collect only the minimum personal data necessary to provide our service:</p>
          <ul>
            <li><strong>Account data:</strong> Email address and name (required for account creation and login).</li>
            <li><strong>Scan data:</strong> URLs you submit for scanning. We do not store the full content of scanned pages.</li>
            <li><strong>Payment data:</strong> Processed entirely by Stripe — we never see or store your payment details.</li>
            <li><strong>Usage data:</strong> Anonymous product usage data to improve the service.</li>
          </ul>

          <h2 id="legal-basis">3. Legal Basis for Processing</h2>
          <p>We process your personal data under the following legal bases:</p>
          <ul>
            <li><strong>Contract (Article 6(1)(b)):</strong> Account creation, service delivery, and billing.</li>
            <li><strong>Consent (Article 6(1)(a)):</strong> Marketing emails (you can opt out anytime).</li>
            <li><strong>Legitimate interests (Article 6(1)(f)):</strong> Service improvement, security monitoring, and fraud prevention.</li>
          </ul>

          <h2 id="data-subject-rights">4. Your Rights Under GDPR</h2>
          <p>As a data subject in the EEA, you have the following rights:</p>
          <ul>
            <li><strong>Right of access (Art. 15):</strong> Request a copy of all personal data we hold about you.</li>
            <li><strong>Right to rectification (Art. 16):</strong> Correct inaccurate or incomplete data via your account settings.</li>
            <li><strong>Right to erasure (Art. 17):</strong> Request deletion of your account and associated data.</li>
            <li><strong>Right to restrict processing (Art. 18):</strong> Limit how we use your data in certain circumstances.</li>
            <li><strong>Right to data portability (Art. 20):</strong> Receive your data in a machine-readable format (CSV).</li>
            <li><strong>Right to object (Art. 21):</strong> Object to processing based on legitimate interests.</li>
          </ul>
          <p className="mt-3">
            To exercise any of these rights, email{' '}
            <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>.
            We will respond within 30 days as required by GDPR.
          </p>

          <h2 id="data-processing">5. Data Processing &amp; Sub-processors</h2>
          <p>We use the following sub-processors who may access personal data:</p>
          <ul>
            <li><strong>Supabase (AWS)</strong> — Database hosting. SOC 2 compliant. Data stored in us-east-1 (Virginia, USA).</li>
            <li><strong>Stripe</strong> — Payment processing. PCI DSS Level 1 certified. Data stored in accordance with Stripe&apos;s DPA.</li>
            <li><strong>Vercel</strong> — Application hosting. Data processed in the region closest to the user.</li>
            <li><strong>Resend</strong> — Transactional email delivery. Data processed in us-east-1.</li>
          </ul>
          <p className="mt-2">
            We have Data Processing Agreements (DPAs) in place with each sub-processor as required by Article 28 of the GDPR.
          </p>

          <h2 id="international-transfers">6. International Data Transfers</h2>
          <p>
            Your personal data is primarily stored and processed in the United States. We rely on the following safeguards for international data transfers:
          </p>
          <ul>
            <li><strong>EU-US Data Privacy Framework</strong> — for transfers to certified sub-processors.</li>
            <li><strong>Standard Contractual Clauses (SCCs)</strong> — adopted by the European Commission.</li>
          </ul>

          <h2 id="data-retention">7. Data Retention</h2>
          <ul>
            <li><strong>Account data:</strong> Retained for the duration of your account plus 90 days after deletion.</li>
            <li><strong>Scan data:</strong> Retained according to your plan&apos;s scan history duration (30 days for Starter, 90 days for Growth, 1 year for Enterprise).</li>
            <li><strong>Payment records:</strong> Retained for 7 years as required by tax law.</li>
          </ul>

          <h2 id="security">8. Data Security</h2>
          <p>We implement the following technical and organizational security measures:</p>
          <ul>
            <li>All data encrypted in transit (TLS 1.3) and at rest (AES-256).</li>
            <li>Row-Level Security (RLS) ensures users can only access their own data.</li>
            <li>Passwords are hashed using bcrypt — we cannot see them.</li>
            <li>Regular security audits and penetration testing.</li>
          </ul>

          <h2 id="breach-notification">9. Data Breach Notification</h2>
          <p>
            In the event of a personal data breach, we will notify the relevant supervisory authority within 72 hours as required by Article 33 of the GDPR. Affected data subjects will be notified without undue delay.
          </p>

          <h2 id="complaints">10. Complaints</h2>
          <p>
            If you believe we have not complied with data protection laws, you have the right to lodge a complaint with your local supervisory authority. Contact us first at{' '}
            <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>{' '}
            and we will do our best to resolve your issue promptly.
          </p>

          <h2 id="dpa">11. Data Processing Agreement (DPA)</h2>
          <p>
            Enterprise customers who require a signed Data Processing Agreement (DPA) can request one by emailing{' '}
            <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>.
            Our DPA incorporates the EU Standard Contractual Clauses (Module 2: Controller-to-Processor) and covers all sub-processors listed in Section 5.
          </p>
        </LegalPageLayout>
      </div>
      <Footer />
    </>
  );
}
