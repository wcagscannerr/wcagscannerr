import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Settings | WCAG Scanner',
  description: 'Manage your WCAG Scanner account settings, profile, and notification preferences.',
  openGraph: {
    title: 'Settings | WCAG Scanner',
    description: 'Manage your WCAG Scanner account settings, profile, and notification preferences.',
    url: 'https://www.wcagscannerr.com/settings',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}