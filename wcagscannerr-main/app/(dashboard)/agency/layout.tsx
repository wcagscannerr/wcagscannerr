import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Agency Dashboard | WCAG Scanner',
  description: 'Manage multiple client websites with the WCAG Scanner agency dashboard. White-labeled reports, monitoring, and full API access.',
  openGraph: {
    title: 'Agency Dashboard | WCAG Scanner',
    description: 'Manage multiple client websites with the WCAG Scanner agency dashboard. White-labeled reports, monitoring, and full API access.',
    url: 'https://www.wcagscannerr.com/agency',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}