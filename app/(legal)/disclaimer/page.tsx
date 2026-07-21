import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Disclaimer | WCAG Scanner',
  description: 'Important disclaimer for WCAG Scanner. Automated scans detect approximately 57% of WCAG issues and results are not legal advice.',
  openGraph: {
    title: 'Disclaimer | WCAG Scanner',
    description: 'Important disclaimer for WCAG Scanner. Automated scans detect approximately 57% of WCAG issues and results are not legal advice.',
    url: 'https://www.wcagscannerr.com/disclaimer',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function DisclaimerPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <LegalPageLayout
          title="Automated Scanning Disclaimer"
          subtitle="Please read this before relying on scan results for legal purposes."
          lastUpdated="January 2025"
        >
          <div className="bg-danger/10 border border-danger/30 rounded-xl p-6 mb-8">
            <h2 className="text-danger font-bold text-lg mb-3">⚠️ THIS TOOL DOES NOT GUARANTEE LEGAL COMPLIANCE</h2>
            <p className="text-sm leading-relaxed">
              WCAG Scanner provides automated WCAG accessibility scanning powered by axe-core, the same engine used in Google Chrome&apos;s Lighthouse audits. Automated scanning detects approximately <strong>57% of WCAG success criteria violations</strong>. The remaining issues require manual testing by a qualified accessibility specialist.
            </p>
            <p className="text-sm leading-relaxed mt-3">
              A high compliance score from our tool does NOT mean your website is legally compliant with the Americans with Disabilities Act (ADA), Section 508, the European Accessibility Act (EAA), or any other accessibility law or regulation.
            </p>
            <p className="text-sm leading-relaxed mt-3">
              DO NOT use our scan results as legal defense in an ADA lawsuit without consulting a qualified attorney and a certified accessibility specialist (CPACC, WAS, or equivalent).
            </p>
            <p className="text-sm font-semibold mt-3">We are not lawyers. This is not legal advice.</p>
          </div>

          <h2 id="can-do">1. What Our Scanner CAN Do</h2>
          <ul>
            <li>Detect the 6 most common violation types that cause 96% of WCAG failures.</li>
            <li>Identify specific HTML elements causing accessibility issues.</li>
            <li>Provide step-by-step remediation guidance for each issue found.</li>
            <li>Monitor your site over time and alert you to regressions.</li>
            <li>Generate a PDF report documenting your remediation efforts.</li>
          </ul>

          <h2 id="cannot-do">2. What Our Scanner CANNOT Do</h2>
          <ul>
            <li>Guarantee full ADA or WCAG legal compliance.</li>
            <li>Test cognitive accessibility, video captions (manual check needed), or complex interactions.</li>
            <li>Serve as a substitute for manual testing with real assistive technology.</li>
            <li>Protect you from legal action on its own.</li>
          </ul>

          <h2 id="next-steps">3. Recommended Next Steps After Scanning</h2>
          <ul>
            <li>Fix all issues flagged by our scanner.</li>
            <li>Hire a manual accessibility auditor for full review (optional but recommended for high-risk sites).</li>
            <li>Consult an ADA attorney if you have received a demand letter.</li>
            <li>Add an Accessibility Statement page to your website.</li>
          </ul>

          <h2 id="resources">4. Resources</h2>
          <ul>
            <li><strong>WebAIM</strong> (<a href="https://webaim.org" target="_blank" rel="noopener" className="text-accent hover:underline">webaim.org</a>) — free manual testing guidance.</li>
            <li><strong>Deque University</strong> (<a href="https://dequeuniversity.com" target="_blank" rel="noopener" className="text-accent hover:underline">dequeuniversity.com</a>) — accessibility training.</li>
            <li><strong>ADA.gov</strong> — official ADA guidance.</li>
            <li><strong>W3C WCAG 2.1</strong> (<a href="https://www.w3.org/TR/WCAG21" target="_blank" rel="noopener" className="text-accent hover:underline">w3.org/TR/WCAG21</a>) — the official standard.</li>
          </ul>
        </LegalPageLayout>
      </div>
      <Footer />
    </>
  );
}