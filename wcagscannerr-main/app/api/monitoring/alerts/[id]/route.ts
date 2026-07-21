import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(
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

    const body = await request.json().catch(() => ({}))
    const { read } = body

    const { data: alert } = await db
      .from('monitoring_alerts')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!alert || alert.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { data: updated, error } = await db
      .from('monitoring_alerts')
      .update({ read: read ?? true })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }

    return NextResponse.json({ alert: updated })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}

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

    const { data: alert } = await db
      .from('monitoring_alerts')
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (!alert || alert.user_id !== user.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const { error } = await db
      .from('monitoring_alerts')
      .delete()
      .eq('id', params.id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Server error' },
      { status: 500 }
    )
  }
}