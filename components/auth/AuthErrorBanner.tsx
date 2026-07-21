'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

const ERROR_MESSAGES: Record<string, Record<string, string>> = {
  access_denied: {
    otp_expired:
      'Your password reset link has expired. This can happen if the link was opened automatically by your email provider\'s security scanner. Please request a new one.',
    default:
      'Access was denied. This may happen if the link was already used or has expired.',
  },
};

function getErrorMessage(error: string, errorCode: string): string | null {
  const codeMessages = ERROR_MESSAGES[error];
  if (!codeMessages) return null;
  return codeMessages[errorCode] || codeMessages.default || null;
}

export default function AuthErrorBanner() {
  const searchParams = useSearchParams();
  const [visible, setVisible] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get('error');
    const errorCode = searchParams.get('error_code');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      const known = getErrorMessage(error, errorCode || '');
      if (known) {
        setMessage(known);
      } else if (errorDescription) {
        setMessage(decodeURIComponent(errorDescription));
      }
    }
  }, [searchParams]);

  if (!message || !visible) return null;

  return (
    <div className="bg-orange-50 border-b border-orange-200 text-orange-800 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4">
        <div className="flex items-start gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {message}{' '}
            <Link
              href="/forgot-password"
              className="underline font-medium hover:text-orange-900"
            >
              Request a new reset link
            </Link>
          </span>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="p-0.5 hover:bg-orange-200/50 rounded transition-colors flex-shrink-0"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}