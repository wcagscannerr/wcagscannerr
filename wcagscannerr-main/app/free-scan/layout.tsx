import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Free WCAG Scan | WCAG Scanner',
  description: 'Run a free WCAG 2.1 accessibility scan on any website. No signup required — get your compliance score and top issues instantly.',
  openGraph: {
    title: 'Free WCAG Scan | WCAG Scanner',
    description: 'Run a free WCAG 2.1 accessibility scan on any website. No signup required — get your compliance score and top issues instantly.',
    url: 'https://www.wcagscannerr.com/free-scan',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}