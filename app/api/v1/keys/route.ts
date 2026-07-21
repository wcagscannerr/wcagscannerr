/**
 * API Keys Management
 * GET /api/v1/keys — List ALL user's API keys (active + revoked)
 * POST /api/v1/keys — Create new API key
 * DELETE /api/v1/keys/:id — Revoke an API key
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { generateApiKey } from '@/lib/api-keys/utils'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const authClient = await createClient()
    const db = createServiceClient()

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { data: keys, error } = await db
      .from('api_keys')
      .select('id, name, prefix, permissions, rate_limit, tier, last_used_at, created_at, revoked_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[API v1/keys] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
    }

    return NextResponse.json({ keys: keys || [] })
  } catch (error: any) {
    console.error('[API v1/keys] GET error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}

const createKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.string()).default(['scan:read', 'scan:create']),
  rate_limit: z.number().int().min(1).max(10000).default(100),
})

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const db = createServiceClient()

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Check user plan for API access
    const { data: profile } = await db
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    // Step 3: API key generation itself is gated, not just call-time.
    // Starter/Growth users cannot mint a working key — the row insert
    // doesn't run, since both this check and the lib/dodo/plans.ts
    // apiAccess flag agree that enterprise is the only valid tier.
    if (!profile || profile.subscription_status !== 'enterprise') {
      return NextResponse.json(
        {
          error: 'API access requires the Enterprise plan',
          code: 'PLAN_INSUFFICIENT',
          upgrade_url: '/pricing',
        },
        { status: 403 }
      )
    }

    const body = await request.json()
    const parsed = createKeySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // FIX: Pass tier to generateApiKey
    const { key, record } = await generateApiKey(
      user.id,
      parsed.data.name,
      parsed.data.permissions,
      parsed.data.rate_limit,
      profile.subscription_status  // <-- PASS TIER HERE
    )

    return NextResponse.json({
      key,
      record: {
        id: record.id,
        name: record.name,
        prefix: record.prefix,
        permissions: record.permissions,
        rate_limit: record.rate_limit,
        tier: record.tier,
        created_at: record.created_at,
      },
    })
  } catch (error: any) {
    console.error('[API v1/keys] POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to create API key' },
      { status: 500 }
    )
  }
}

/** DELETE /api/v1/keys/:id — Revoke an API key */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authClient = await createClient()
    const db = createServiceClient()

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const id = params.id
    if (!id) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 })
    }

    // Verify key belongs to user
    const { data: keyRecord } = await db
      .from('api_keys')
      .select('id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!keyRecord) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const { error } = await db
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      console.error('[API v1/keys] Revoke error:', error)
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    }

    return NextResponse.json({ message: 'API key revoked' })
  } catch (error: any) {
    console.error('[API v1/keys] DELETE error:', error)
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}