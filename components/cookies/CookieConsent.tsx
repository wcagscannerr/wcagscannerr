'use client'

import { useState, useEffect } from 'react'
import { Cookie, Shield, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false)
  const [hasConsented, setHasConsented] = useState(true)

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent')
    if (!consent) {
      setHasConsented(false)
      // Show banner after a short delay
      setTimeout(() => setShowBanner(true), 1000)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted')
    setHasConsented(true)
    setShowBanner(false)
  }

  const handleDecline = () => {
    localStorage.setItem('cookie-consent', 'declined')
    setHasConsented(true)
    setShowBanner(false)
  }

  // Don't show if already consented
  if (hasConsented) return null

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6"
        >
          <div className="max-w-4xl mx-auto glass-panel-strong rounded-2xl p-5 sm:p-6 glow-border shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Shield className="w-4 h-4 text-primary" />
                  We value your privacy
                </h3>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  We use cookies to enhance your experience, analyze site traffic, and personalize content.
                  By clicking &quot;Accept All&quot;, you consent to our use of cookies.
                  You can manage your preferences or learn more in our{' '}
                  <Link href="/privacy-policy" className="text-primary hover:text-primary/80 underline underline-offset-2">
                    Privacy Policy
                  </Link>.
                </p>
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={handleAccept}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-medium btn-magnetic"
                  >
                    Accept All
                  </button>
                  <button
                    onClick={handleDecline}
                    className="px-4 py-2 border border-border rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all"
                  >
                    Decline
                  </button>
                </div>
              </div>
              <button
                onClick={handleDecline}
                className="p-2 text-muted-foreground hover:text-foreground transition-colors flex-shrink-0"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
