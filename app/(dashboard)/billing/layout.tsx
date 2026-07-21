import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Billing | WCAG Scanner',
  description: 'View and manage your WCAG Scanner subscription, invoices, and plan details from your billing settings.',
  openGraph: {
    title: 'Billing | WCAG Scanner',
    description: 'View and manage your WCAG Scanner subscription, invoices, and plan details from your billing settings.',
    url: 'https://www.wcagscannerr.com/billing',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}