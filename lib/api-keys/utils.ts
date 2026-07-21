/**
 * API Key Management
 *
 * - Generates secure random API keys (64-char hex)
 * - Hashes keys with SHA-256 for storage (only hash stored)
 * - Validates keys against stored hashes
 * - Supports rate limiting metadata
 */

import { createServiceClient } from '@/lib/supabase/server'

const API_PREFIX = 'wcag_live_'

export interface ApiKeyRecord {
  id: string
  user_id: string
  name: string
  key_hash: string
  prefix: string
  permissions: string[]
  rate_limit: number
  tier: string
  last_used_at: string | null
  created_at: string
  revoked_at: string | null
}

/**
 * Generate a new API key. Returns the plaintext key (shown once to user)
 * and stores only the hash.
 */
export async function generateApiKey(
  userId: string,
  name: string,
  permissions: string[] = ['scan:read', 'scan:create'],
  rateLimitPerHour: number = 100,
  tier: string = 'free'
): Promise<{ key: string; record: ApiKeyRecord }> {
  const db = createServiceClient()

  // Generate 32 random bytes = 64 hex chars
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const randomHex = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const key = `${API_PREFIX}${randomHex}`
  const prefix = key.slice(0, 16)

  // Hash the key
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const { data: record, error } = await db
    .from('api_keys')
    .insert({
      user_id: userId,
      name,
      key_hash: keyHash,
      prefix,
      permissions,
      rate_limit: rateLimitPerHour,
      tier,
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create API key: ${error.message}`)
  }

  return { key, record: record as ApiKeyRecord }
}

/**
 * Validate an API key from the Authorization header.
 * Returns the key record if valid, null otherwise.
 */
export async function validateApiKey(
  authHeader: string | null
): Promise<ApiKeyRecord | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const key = authHeader.slice(7)
  if (!key.startsWith(API_PREFIX)) {
    return null
  }

  const db = createServiceClient()

  // Hash the provided key
  const encoder = new TextEncoder()
  const data = encoder.encode(key)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Look up by hash
  const { data: records } = await db
    .from('api_keys')
    .select('*')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (!records) {
    return null
  }

  // Update last_used_at
  await db
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', records.id)

  return records as ApiKeyRecord
}

/**
 * Check if key has required permission.
 */
export function hasPermission(key: ApiKeyRecord, permission: string): boolean {
  return key.permissions.includes(permission) || key.permissions.includes('*')
}