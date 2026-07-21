import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/api-keys/generate';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
});

const revokeSchema = z.object({
  id: z.string().uuid('Invalid key ID'),
});

/**
 * GET /api/keys — list all active keys for the current user (prefix only, no hashes exposed)
 */
export async function GET() {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = createServiceClient();
  const { data: keys, error } = await db
    .from('api_keys')
    .select('id, name, prefix, tier, rate_limit, created_at, last_used_at, revoked_at')
    .eq('user_id', user.id)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch API keys:', error);
    return NextResponse.json({ error: 'Failed to fetch API keys' }, { status: 500 });
  }

  return NextResponse.json({ keys: keys || [] });
}

/**
 * POST /api/keys — create a new API key
 */
export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name } = parsed.data;
  const db = createServiceClient();

  // Check user has Pro/Agency plan for API access
  const { data: profile } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();
  // Step 3: API key generation itself is gated, not just call-time.
  // A Starter/Growth user hitting this POST gets a 403 telling them
  // exactly which plan they need — no row gets written even on success.
  if (!profile || profile.subscription_status !== 'enterprise') {
    return NextResponse.json(
      {
        error: 'API access requires the Enterprise plan',
        code: 'PLAN_INSUFFICIENT',
        upgrade_url: '/pricing',
      },
      { status: 403 }
    );
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey(name);

  const { error: insertError, data: keyRecord } = await db
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_hash: keyHash,
      prefix: keyPrefix,
      tier: profile.subscription_status,
      rate_limit: 100,
    })
    .select()
    .single();

  if (insertError) {
    console.error('Failed to create API key:', insertError);
    return NextResponse.json({ error: 'Failed to create API key' }, { status: 500 });
  }

  // Return the raw key only once
  return NextResponse.json({
    id: keyRecord.id,
    name: keyRecord.name,
    prefix: keyRecord.prefix,
    raw_key: rawKey,
    created_at: keyRecord.created_at,
  });
}

/**
 * DELETE /api/keys — revoke an API key (soft-delete via revoked_at)
 */
export async function DELETE(request: NextRequest) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const parsed = revokeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { id } = parsed.data;
  const db = createServiceClient();

  // Ensure the key belongs to this user
  const { data: keyRecord } = await db
    .from('api_keys')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!keyRecord) {
    return NextResponse.json({ error: 'API key not found' }, { status: 404 });
  }

  const { error } = await db
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to revoke API key:', error);
    return NextResponse.json({ error: 'Failed to revoke API key' }, { status: 500 });
  }

  return NextResponse.json({ message: 'API key revoked' });
}