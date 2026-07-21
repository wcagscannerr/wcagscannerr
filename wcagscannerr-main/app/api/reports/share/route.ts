import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

function generateSlug(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

const shareRequestSchema = z.object({
  scan_id: z.string().uuid(),
  expires_in_days: z.number().int().min(1).max(365).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const authClient = await createClient()
    const db = createServiceClient()

    const { data: { user } } = await authClient.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = shareRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { scan_id, expires_in_days } = parsed.data

    const { data: scan, error: scanError } = await db
      .from('scans')
      .select('id, user_id, status')
      .eq('id', scan_id)
      .single()

    if (scanError || !scan) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 })
    }

    if (scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (scan.status !== 'completed') {
      return NextResponse.json(
        { error: 'Cannot share incomplete scan' },
        { status: 400 }
      )
    }

    const { data: existingShare } = await db
      .from('shared_reports')
      .select('slug, revoked_at')
      .eq('scan_id', scan_id)
      .single()

    if (existingShare) {
      if (!existingShare.revoked_at || new Date(existingShare.revoked_at) > new Date()) {
        return NextResponse.json({
          shareUrl: `/r/${existingShare.slug}`,
          expiresAt: existingShare.revoked_at,
        })
      }
    }

    let slug = generateSlug(8)
    let attempts = 0
    const maxAttempts = 10

    while (attempts < maxAttempts) {
      const { data: existing } = await db
        .from('shared_reports')
        .select('slug')
        .eq('slug', slug)
        .single()

      if (!existing) break
      slug = generateSlug(8)
      attempts++
    }

    if (attempts >= maxAttempts) {
      return NextResponse.json(
        { error: 'Failed to generate unique share link' },
        { status: 500 }
      )
    }

    const expiresAt = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { error: insertError } = await db.from('shared_reports').insert({
      scan_id,
      slug,
      created_by: user.id,
      revoked_at: expiresAt,
      view_count: 0,
    })

    if (insertError) {
      console.error('[SHARE] Insert failed:', insertError)
      return NextResponse.json(
        { error: 'Failed to create share link' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      shareUrl: `/r/${slug}`,
      expiresAt: expiresAt,
    })
  } catch (error: any) {
    console.error('[SHARE] POST error:', error)
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}