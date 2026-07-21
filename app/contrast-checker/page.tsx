import type { Metadata } from 'next'
import { ContrastCheckerClient } from './ContrastCheckerClient'

export const metadata: Metadata = {
  title: 'Free WCAG Contrast Checker | WCAG Scanner',
  description: 'Check color contrast ratios instantly. Free tool for WCAG AA and AAA compliance. Supports normal text, large text, and UI components.',
  keywords: ['contrast checker', 'WCAG contrast', 'accessibility contrast', 'color contrast ratio', 'ADA compliance'],
  openGraph: {
    title: 'Free WCAG Contrast Checker',
    description: 'Instantly check if your colors meet WCAG AA and AAA standards.',
    type: 'website',
  },
}

export default function ContrastCheckerPage() {
  return (
    <div className="min-h-screen bg-background">
      <ContrastCheckerClient />
    </div>
  )
}