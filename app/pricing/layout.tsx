import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | WCAG Scanner',
  description: 'Simple, transparent pricing for WCAG accessibility scanning. Start free with 3 scans, then upgrade to Pro or Agency for monitoring, PDF reports, and API access.',
  openGraph: {
    title: 'Pricing | WCAG Scanner',
    description: 'Simple, transparent pricing for WCAG accessibility scanning. Start free with 3 scans, then upgrade to Pro or Agency for monitoring, PDF reports, and API access.',
    url: 'https://www.wcagscannerr.com/pricing',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}