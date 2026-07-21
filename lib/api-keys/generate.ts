import { createHash, randomBytes } from 'crypto'

/**
 * Generates a new API key pair:
 * - rawKey: the clear-text key shown to the user once (e.g. "wca_xxxxx...")
 * - keyHash: SHA-256 hash of the raw key (stored in DB)
 * - keyPrefix: short prefix for display purposes (e.g. "wca_...")
 */
export function generateApiKey(name: string): {
  rawKey: string
  keyHash: string
  keyPrefix: string
} {
  const entropy = randomBytes(32).toString('hex')
  const rawKey = `wca_${entropy}`
  const keyHash = createHash('sha256').update(rawKey).digest('hex')
  const keyPrefix = rawKey.substring(0, 10) + '...'

  return { rawKey, keyHash, keyPrefix }
}

/**
 * Hashes an API key for lookup — used when authenticating
 * incoming X-API-Key requests.
 */
export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex')
}