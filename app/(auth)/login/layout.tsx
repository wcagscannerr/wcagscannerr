import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | WCAG Scanner',
  description: 'Sign in to your WCAG Scanner account to manage scans, monitor websites, and view your accessibility compliance reports.',
  openGraph: {
    title: 'Sign In | WCAG Scanner',
    description: 'Sign in to your WCAG Scanner account to manage scans, monitor websites, and view your accessibility compliance reports.',
    url: 'https://www.wcagscannerr.com/login',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}