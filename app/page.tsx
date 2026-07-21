import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/landing/Hero'
import Features from '@/components/landing/Features'
import HowItWorks from '@/components/landing/HowItWorks'
import SocialProof from '@/components/landing/SocialProof'
import Pricing from '@/components/landing/Pricing'
import FAQ from '@/components/landing/FAQ'
import CTA from '@/components/landing/CTA'

export const metadata = {
  title: 'WCAG Scanner — Automated Accessibility Compliance',
  description: 'Scan your website for WCAG accessibility violations. Get detailed reports, fix guidance, and compliance scores in seconds.',
  openGraph: {
    title: 'WCAG Scanner — Automated Accessibility Compliance',
    description: 'Scan your website for WCAG accessibility violations. Get detailed reports, fix guidance, and compliance scores in seconds.',
    url: 'https://www.wcagscannerr.com',
    siteName: 'WCAG Scanner',
    images: ['/og-image.png'],
    type: 'website',
  },
}

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main className="relative">
        <Hero />
        <SocialProof />
        <Features />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <CTA />
      </main>
      <Footer />
    </>
  )
}