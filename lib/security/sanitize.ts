/**
 * Input sanitization utilities for XSS prevention.
 * These are defense-in-depth measures — always validate on the server too.
 */

/**
 * Strip HTML tags from a string to prevent XSS.
 */
export function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Escape HTML entities to safely render user input.
 */
export function escapeHtml(input: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  }
  return input.replace(/[&<>"'/]/g, (char) => map[char])
}

/**
 * Sanitize a URL to prevent javascript: and data: protocol attacks.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase()
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:')) {
    return '#'
  }
  return url
}

/**
 * Validate email format.
 */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Validate password strength — at least 8 chars, 1 uppercase, 1 lowercase, 1 number.
 */
export function isStrongPassword(password: string): boolean {
  return password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
}

/**
 * Generate a CSRF-safe nonce for inline scripts.
 * Works both client-side and server-side.
 */
export function generateNonce(): string {
  // Browser client-side
  if (typeof window !== 'undefined' && globalThis.crypto) {
    const array = new Uint8Array(16)
    globalThis.crypto.getRandomValues(array)
    return btoa(String.fromCharCode(...array))
  }
  // Node.js server-side — use dynamic import to avoid bundler issues
  try {
    const { randomBytes } = eval('require("crypto")')
    return randomBytes(16).toString('base64')
  } catch {
    // Fallback: generate random bytes using Math.random
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    let result = ''
    for (let i = 0; i < 22; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
}
