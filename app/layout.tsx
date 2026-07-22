export const dynamic = 'force-dynamic';

import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import CookieConsent from '@/components/cookies/CookieConsent';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://www.wcagscannerr.com'),
  title: 'WCAG Scanner — Automated Accessibility Compliance Audits',
  description:
    'Scan your website for WCAG and ADA compliance issues in seconds. Free scanner detects the 6 issues causing 96% of accessibility failures.',
  keywords: 'WCAG scanner, ADA compliance, accessibility audit, web accessibility, Section 508, axe-core scanner',
  openGraph: {
    title: 'WCAG Scanner — Automated Accessibility Compliance Audits',
    description: 'Free instant scan for WCAG/ADA violations. Fix the issues that cause 96% of lawsuits.',
    type: 'website',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WCAG Scanner',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icons/pwa-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#050507' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/pwa-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="min-h-screen bg-background text-text-primary antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
        <CookieConsent />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('[PWA] Service Worker registered, scope:', reg.scope);
                  }).catch(function(err) {
                    console.log('[PWA] Service Worker registration failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
