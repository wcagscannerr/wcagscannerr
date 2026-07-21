/**
 * GET /api/v1/keys/usage
 *
 * Step 5 — Per-key usage stats for the Enterprise api-keys dashboard.
 * Returns the last 20 calls for every key the current user owns,
 * grouped by api_key_id so the dashboard can render a usage table
 * under each active key row without making N+1 follow-up calls.
 *
 * Auth: same session cookie as /api/v1/keys (apiAccess gating is
 * enforced by the key-creation route, not here — a user who once
 * dropped to Starter must still be able to view historical usage
 * stats on the keys they previously generated). The subscription_status
 * gate already blocks Starter/Growth from generating fresh keys
 * (Step 3) so the same user cannot simply rotate in new keys here.
 */
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const PER_KEY_LIMIT = 20

export async function GET() {
  try {
    const authClient = await createClient()
    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const db = createServiceClient()

    // Fetch the user's keys (used as both the auth filter and the page's
    // "active keys" row set). Single RPC-equivalent read.
    const { data: keys } = await db
      .from('api_keys')
      .select('id')
      .eq('user_id', user.id)

    const keyIds = (keys || []).map((k: { id: string }) => k.id)
    if (keyIds.length === 0) {
      return NextResponse.json({ usage: {} })
    }

    // Spec: last 20 per key. We pull the most recent PER_KEY_LIMIT * N
    // globally then bucket in JS — cheaper than N round-trips. The
    // idx_api_key_usage_key_recent index keeps it tight.
    const { data: rows, error } = await db
      .from('api_key_usage')
      .select('id, api_key_id, target_url, passed, status_code, response_time_ms, score, created_at')
      .eq('user_id', user.id)
      .in('api_key_id', keyIds)
      .order('created_at', { ascending: false })
      .limit(PER_KEY_LIMIT * keyIds.length)

    if (error) {
      console.error('[API v1/keys/usage] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch usage' }, { status: 500 })
    }

    // Bucket + cap to PER_KEY_LIMIT per key.
    const usage: Record<string, Array<{
      id: string
      target_url: string
      passed: boolean | null
      status_code: number
      response_time_ms: number
      score: number | null
      created_at: string
    }>> = {}
    for (const k of keyIds) usage[k] = []
    for (const row of rows || []) {
      const bucket = usage[row.api_key_id]
      if (bucket && bucket.length < PER_KEY_LIMIT) bucket.push(row)
    }

    return NextResponse.json({ usage })
  } catch (err: any) {
    console.error('[API v1/keys/usage] GET error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server error' },
      { status: 500 }
    )
  }
}
