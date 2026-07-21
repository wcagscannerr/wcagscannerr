import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Monitoring | WCAG Scanner',
  description: 'Continuously monitor your websites for new WCAG accessibility issues with automated WCAG Scanner monitoring.',
  openGraph: {
    title: 'Monitoring | WCAG Scanner',
    description: 'Continuously monitor your websites for new WCAG accessibility issues with automated WCAG Scanner monitoring.',
    url: 'https://www.wcagscannerr.com/monitoring',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}