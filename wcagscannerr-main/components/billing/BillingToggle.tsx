'use client';

import { motion } from 'framer-motion';

interface Props {
  isAnnual: boolean;
  onToggle: (isAnnual: boolean) => void;
}

export default function BillingToggle({ isAnnual, onToggle }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 mb-8">
      <span className={`text-sm font-medium transition-colors ${!isAnnual ? 'text-text-primary' : 'text-text-muted'}`}>
        Monthly
      </span>
      <button
        onClick={() => onToggle(!isAnnual)}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          isAnnual ? 'bg-accent' : 'bg-border'
        }`}
        aria-label={`Switch to ${isAnnual ? 'monthly' : 'annual'} billing`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="block w-5 h-5 bg-white rounded-full shadow-md"
          style={{ marginLeft: isAnnual ? '1.5rem' : '0.25rem', marginTop: '0.125rem' }}
        />
      </button>
      <span className={`text-sm font-medium transition-colors ${isAnnual ? 'text-text-primary' : 'text-text-muted'}`}>
        Annual
        <span className="ml-1 text-xs text-success font-semibold">Save 2 months</span>
      </span>
    </div>
  );
}