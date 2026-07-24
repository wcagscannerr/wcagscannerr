import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Accessibility Statement | WCAG Scanner',
  description: 'WCAG Scanner is committed to digital accessibility. Read our accessibility statement detailing our efforts to maintain an inclusive platform.',
  openGraph: {
    title: 'Accessibility Statement | WCAG Scanner',
    description: 'WCAG Scanner is committed to digital accessibility. Read our accessibility statement.',
    url: 'https://www.wcagscannerr.com/accessibility-statement',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function AccessibilityStatementPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <LegalPageLayout
          title="Accessibility Statement"
          subtitle="Our commitment to an inclusive, accessible web experience for everyone."
          lastUpdated="July 2026"
        >
          <div className="warning-box mb-6">
            <p className="text-sm">
              WCAG Scanner is committed to ensuring digital accessibility for people with disabilities. We continually improve the user experience for everyone and apply the relevant accessibility standards.
            </p>
          </div>

          <h2 id="conformance-status">1. Conformance Status</h2>
          <p>
            The <strong>Web Content Accessibility Guidelines (WCAG)</strong> define requirements for designers and developers to improve accessibility for people with disabilities. <strong>WCAG Scanner</strong> aims to be <strong>WCAG 2.1 Level AA</strong> conformat. We use our own scanning tool to test our platform and remediate issues as they are discovered.
          </p>

          <h2 id="measures">2. Measures to Support Accessibility</h2>
          <p>WCAG Scanner takes the following measures to ensure accessibility of our platform:</p>
          <ul>
            <li>Integrate accessibility testing into our development workflow using our own scanning engine.</li>
            <li>Provide accessibility training to all team members involved in design and development.</li>
            <li>Assign clear accessibility targets and responsibilities to product teams.</li>
            <li>Conduct periodic manual audits using assistive technologies (screen readers, keyboard-only navigation).</li>
            <li>Publish regular accessibility status reports internally.</li>
          </ul>

          <h2 id="limitations">3. Known Limitations</h2>
          <p>
            Despite our best efforts, some areas of the platform may still have accessibility gaps. We are actively working to address these:
          </p>
          <ul>
            <li><strong>Third-party widgets:</strong> Some integrated components (e.g., payment forms via Stripe) may have limitations outside our direct control.</li>
            <li><strong>Legacy reports:</strong> PDF reports generated before July 2026 may not be fully accessible. All new reports use tagged accessible PDFs.</li>
            <li><strong>Complex data tables:</strong> Some detailed violation tables may be difficult to navigate with screen readers. We provide alternative summary views.</li>
          </ul>

          <h2 id="feedback">4. Feedback &amp; Contact</h2>
          <p>
            We welcome your feedback on the accessibility of WCAG Scanner. Please let us know if you encounter accessibility barriers:
          </p>
          <ul>
            <li>Email: <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a></li>
            <li>Response time: We aim to respond within 2 business days.</li>
            <li>We will work with you to provide the information you need through an accessible alternative.</li>
          </ul>

          <h2 id="complaints">5. Complaint Process</h2>
          <p>
            If you are not satisfied with our response to an accessibility issue, you may escalate by emailing <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a> with &quot;Accessibility Escalation&quot; in the subject line. We will acknowledge your complaint within 3 business days and provide a full response within 10 business days.
          </p>

          <h2 id="assessment">6. Assessment Approach</h2>
          <p>WCAG Scanner assesses the accessibility of our platform using the following approach:</p>
          <ul>
            <li><strong>Self-evaluation:</strong> We use our own scanning tool for automated checks.</li>
            <li><strong>Manual testing:</strong> Periodic manual audits using screen readers (NVDA, VoiceOver, JAWS) and keyboard-only navigation.</li>
            <li><strong>External audits:</strong> Annual third-party accessibility audit by a certified accessibility consultant.</li>
          </ul>

          <h2 id="date">7. Date</h2>
          <p>This statement was created on July 1, 2026, and was last reviewed on July 22, 2026.</p>
        </LegalPageLayout>
      </div>
      <Footer />
    </>
  );
}
