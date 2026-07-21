import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDodo } from '@/lib/dodo/client'

export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_id, subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile?.subscription_id || profile.subscription_status === 'free') {
      return Response.json({ error: 'No active subscription' }, { status: 400 })
    }

    // Cancel the subscription via Dodo SDK
    const dodo = getDodo()
    await dodo.subscriptions.update(profile.subscription_id, { status: 'cancelled' })

    // Note: subscription_status will be updated by the webhook when Dodo
    // sends the 'subscription.cancelled' event — don't update it here.

    return Response.json({ success: true, message: 'Subscription cancelled. Your plan will update when Dodo processes it.' })
  } catch (err: any) {
    console.error('Cancel error:', err)
    return Response.json({ error: 'Failed to cancel subscription' }, { status: 500 })
  }
}