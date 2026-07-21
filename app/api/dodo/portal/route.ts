import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDodo } from '@/lib/dodo/client'

export async function POST(request: Request) {
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
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile?.stripe_customer_id) {
    return Response.json(
      { error: 'No active subscription found' },
      { status: 400 }
    )
  }

  try {
    const dodo = getDodo()
    const session = await dodo.customers.customerPortal.create(
      profile.stripe_customer_id
    )

    console.log('Portal session created:', session.link)

    return Response.json({ url: session.link })
  } catch (err: any) {
    console.error('Failed to create portal session:', err)
    return Response.json(
      { error: 'Could not open subscription management. Please try again.' },
      { status: 500 }
    )
  }
}