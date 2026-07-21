import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Reset Password | WCAG Scanner',
  description: 'Forgot your WCAG Scanner password? Enter your email to receive a secure link to reset it.',
  openGraph: {
    title: 'Reset Password | WCAG Scanner',
    description: 'Forgot your WCAG Scanner password? Enter your email to receive a secure link to reset it.',
    url: 'https://www.wcagscannerr.com/forgot-password',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}