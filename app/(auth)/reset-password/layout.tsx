import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Set New Password | WCAG Scanner',
  description: 'Choose a new password for your WCAG Scanner account to regain access to your accessibility scans and reports.',
  openGraph: {
    title: 'Set New Password | WCAG Scanner',
    description: 'Choose a new password for your WCAG Scanner account to regain access to your accessibility scans and reports.',
    url: 'https://www.wcagscannerr.com/reset-password',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}