import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign Up | WCAG Scanner',
  description: 'Create a free WCAG Scanner account and start scanning your website for accessibility issues. Upgrade anytime for monitoring and reports.',
  openGraph: {
    title: 'Sign Up | WCAG Scanner',
    description: 'Create a free WCAG Scanner account and start scanning your website for accessibility issues. Upgrade anytime for monitoring and reports.',
    url: 'https://www.wcagscannerr.com/signup',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}