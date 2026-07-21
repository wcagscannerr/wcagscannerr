'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, X, Check } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  scanUrl?: string;
}

export default function EmailCaptureModal({ isOpen, onClose }: Props) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), source: 'free_scan' }),
      });

      if (res.ok) {
        setStatus('success');
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Something went wrong');
        setStatus('error');
      }
    } catch {
      setErrorMsg('Network error. Please try again.');
      setStatus('error');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
            className="bg-white border border-white/80 rounded-2xl p-6 max-w-md w-full shadow-2xl text-slate-900"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">
                    {status === 'success' ? "You're in!" : 'Get Your Results Emailed'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {status === 'success'
                      ? 'We\'ll send you compliance tips too.'
                      : 'Plus weekly accessibility tips, no spam.'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-slate-500 hover:text-slate-900 transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {status === 'success' ? (
              <div className="text-center py-4">
                <Check className="w-10 h-10 text-success mx-auto mb-3" />
                <p className="text-sm text-slate-600">
                  Check your inbox for your scan results!
                </p>
                <button
                  onClick={onClose}
                  className="mt-4 px-5 py-2 text-sm font-medium bg-primary hover:opacity-90 text-primary-foreground rounded-lg transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 outline-none focus:border-primary transition-colors text-sm"
                  />
                  {status === 'error' && (
                    <p className="text-xs text-danger mt-1">{errorMsg}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={status === 'loading' || !email.trim()}
                    className="flex-1 px-4 py-2.5 bg-primary hover:opacity-90 disabled:opacity-50 text-primary-foreground text-sm font-semibold rounded-lg transition-colors"
                  >
                    {status === 'loading' ? 'Sending...' : 'Send My Results'}
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg transition-colors"
                  >
                    No thanks
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}