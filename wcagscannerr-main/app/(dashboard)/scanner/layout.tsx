import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'New Scan | WCAG Scanner',
  description: 'Run a new WCAG 2.1 accessibility scan on any website and get a detailed compliance report with fix guidance.',
  openGraph: {
    title: 'New Scan | WCAG Scanner',
    description: 'Run a new WCAG 2.1 accessibility scan on any website and get a detailed compliance report with fix guidance.',
    url: 'https://www.wcagscannerr.com/scanner',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}