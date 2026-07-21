import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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

    const { data: key } = await db
      .from('api_keys')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!key || key.user_id !== user.id) {
      return NextResponse.json({ error: 'Key not found' }, { status: 404 })
    }

    const { error } = await db
      .from('api_keys')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to revoke key' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 })
  }
}