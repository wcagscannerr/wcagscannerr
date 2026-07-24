import Link from 'next/link'
import { ScanLine, Github, Mail } from 'lucide-react'

const footerLinks = {
  Product: [
    { label: 'Scanner', href: '/scanner' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Sample Report', href: '/sample-report' },
    { label: 'API', href: '/settings/api-keys' },
  ],
  Resources: [
    { label: 'Help Center', href: '/help-center' },
    { label: 'Changelog', href: '/changelog' },
    { label: 'Comparison FAQ', href: '/compare' },
  ],
  Legal: [
    { label: 'Privacy Policy', href: '/privacy-policy' },
    { label: 'Terms of Service', href: '/terms-of-service' },
    { label: 'Disclaimer', href: '/disclaimer' },
    { label: 'Refund Policy', href: '/refund-policy' },
    { label: 'Cookie Policy', href: '/cookie-policy' },
    { label: 'GDPR Compliance', href: '/gdpr' },
    { label: 'Accessibility Statement', href: '/accessibility-statement' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
}

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="glass-panel rounded-3xl p-8 lg:p-10 glow-border">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                <ScanLine className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-sm text-foreground tracking-tight">WCAG Scanner</span>
            </Link>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Automated accessibility compliance scanning for modern web teams.
            </p>
            <div className="flex items-center gap-3">
              <a href="https://github.com/wcagscannerr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="GitHub Organization">
                <Github className="w-4 h-4" />
              </a>
              <a href="mailto:reports@wcagscannerr.com" className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Email us">
                <Mail className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-4">{category}</h3>
              <nav aria-label={`${category} links`}>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} WCAG Scanner. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built with axe-core · Not legal advice
          </p>
        </div>
        </div>
      </div>
    </footer>
  )
}
