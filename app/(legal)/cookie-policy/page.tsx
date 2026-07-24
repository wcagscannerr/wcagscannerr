import LegalPageLayout from '@/components/legal/LegalPageLayout';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy | WCAG Scanner',
  description: 'WCAG Scanner uses only essential cookies. Read our cookie policy to understand what we store and why.',
  openGraph: {
    title: 'Cookie Policy | WCAG Scanner',
    description: 'WCAG Scanner uses only essential cookies. No tracking or advertising cookies.',
    url: 'https://www.wcagscannerr.com/cookie-policy',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <div className="pt-16">
        <LegalPageLayout
          title="Cookie Policy"
          subtitle="We believe in minimal, transparent cookie usage."
          lastUpdated="July 2026"
        >
          <div className="warning-box mb-6">
            <p className="text-sm">
              This policy explains what cookies WCAG Scanner uses and why. We take a minimal approach — only essential cookies, no tracking.
            </p>
          </div>

          <h2 id="what-are-cookies">1. What Are Cookies?</h2>
          <p>
            Cookies are small text files stored on your device by your web browser. They are widely used to make websites work efficiently and provide core functionality like user authentication.
          </p>

          <h2 id="cookies-we-use">2. Cookies We Use</h2>
          <p>We use only the following strictly necessary cookies:</p>
          <div className="overflow-x-auto my-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-semibold">Cookie Name</th>
                  <th className="text-left p-3 font-semibold">Purpose</th>
                  <th className="text-left p-3 font-semibold">Duration</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border">
                  <td className="p-3 font-mono text-xs">sb-*-auth-token</td>
                  <td className="p-3">Authentication session — keeps you logged in</td>
                  <td className="p-3">Session / persistent</td>
                </tr>
                <tr className="border-b border-border">
                  <td className="p-3 font-mono text-xs">sb-*-refresh-token</td>
                  <td className="p-3">Refreshes your authentication session automatically</td>
                  <td className="p-3">Persistent (up to 60 days)</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono text-xs">supabase-auth-token</td>
                  <td className="p-3">Legacy Supabase auth token for session management</td>
                  <td className="p-3">Session</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2 id="no-tracking">3. No Tracking or Advertising Cookies</h2>
          <p>
            <strong>We do not use any tracking, analytics, advertising, or third-party cookies.</strong> We do not use Google Analytics, Facebook Pixel, or any other analytics or tracking service that sets cookies on your device. We believe your browsing activity is your own business.
          </p>

          <h2 id="consent">4. Consent</h2>
          <p>
            Because we only use essential cookies (which are exempt from consent requirements under GDPR and ePrivacy Directive), we do not display a cookie consent banner. If we ever add any non-essential cookies in the future, we will:
          </p>
          <ul>
            <li>Notify all registered users via email at least 14 days in advance.</li>
            <li>Add a cookie consent banner with granular opt-in/opt-out controls.</li>
            <li>Update this policy accordingly.</li>
          </ul>

          <h2 id="third-party">5. Third-Party Services</h2>
          <p>The following third-party services we use may set their own essential cookies:</p>
          <ul>
            <li><strong>Supabase</strong> — authentication and database cookies (required for login)</li>
            <li><strong>Stripe</strong> — cookies on the payment checkout page only (required for payment processing)</li>
            <li><strong>Vercel</strong> — hosting-level cookies for CDN and performance</li>
          </ul>
          <p className="mt-2">
            These are all essential for the service to function. None of these are used for tracking or advertising.
          </p>

          <h2 id="changes">6. Changes to This Policy</h2>
          <p>
            We will notify registered users via email at least 14 days before making any material changes to our cookie usage.
          </p>

          <h2 id="contact">7. Contact Us</h2>
          <p>
            If you have questions about this cookie policy, email us at{' '}
            <a href="mailto:reports@wcagscannerr.com" className="text-accent hover:underline">reports@wcagscannerr.com</a>.
          </p>
        </LegalPageLayout>
      </div>
      <Footer />
    </>
  );
}
