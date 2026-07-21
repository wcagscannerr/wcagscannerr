import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getDodo } from '@/lib/dodo/client'
import { PLANS, PlanId } from '@/lib/dodo/plans'

export async function POST(request: Request) {
  try {
    const body = await request.json()

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

    const plan = body.plan as PlanId
    const billingPeriod = body.billingPeriod || 'monthly'

    // Step 2: valid paid tier IDs are starter/growth/enterprise
    if (plan !== 'starter' && plan !== 'growth' && plan !== 'enterprise') {
      return Response.json({ error: 'Invalid plan' }, { status: 400 })
    }

    if (billingPeriod !== 'monthly' && billingPeriod !== 'annual') {
      return Response.json({ error: 'Invalid billing period' }, { status: 400 })
    }

    const planConfig = PLANS[plan]
    const productId = billingPeriod === 'annual'
      ? planConfig.dodoAnnualProductId
      : planConfig.dodoProductId

    if (!productId) {
      const missingVar = billingPeriod === 'annual'
        ? `DODO_${plan.toUpperCase()}_ANNUAL_PRODUCT_ID`
        : `DODO_${plan.toUpperCase()}_PRODUCT_ID`
      console.error(`Missing env var: ${missingVar} for plan "${plan}" (${billingPeriod})`)
      return Response.json(
        { error: `Product configuration missing for ${plan} (${billingPeriod}). Contact support.` },
        { status: 500 }
      )
    }

    const dodo = getDodo()

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, email, full_name')
      .eq('id', user.id)
      .single()

    // Reuse stripe_customer_id column to store the Dodo customer_id
    let dodoCustomerId = profile?.stripe_customer_id
    let needsNewCustomer = !dodoCustomerId

    if (dodoCustomerId) {
      try {
        await dodo.customers.retrieve(dodoCustomerId)
      } catch (err) {
        console.log(
          'Stored customer ID invalid in current environment, creating new one:',
          dodoCustomerId
        )
        needsNewCustomer = true
      }
    }

    if (needsNewCustomer) {
      const customer = await dodo.customers.create({
        email: profile?.email || user.email!,
        name: profile?.full_name || user.email!,
      })
      dodoCustomerId = customer.customer_id

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: dodoCustomerId })
        .eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL

    const payment = await dodo.subscriptions.create({
      product_id: productId!,
      customer: { customer_id: dodoCustomerId },
      payment_link: true,
      return_url: `${appUrl}/billing?success=true`,
      billing: {
        city: 'N/A',
        country: 'US',
        state: 'N/A',
        street: 'N/A',
      },
      quantity: 1,
      metadata: {
        userId: user.id,
        plan: plan,
        billingPeriod,
      },
    })

    return Response.json({ url: payment.payment_link })
  } catch (err: any) {
    console.error('Checkout error:', err)
    const message = err?.message || err?.error?.message || 'Checkout failed'
    return Response.json({ error: message }, { status: 500 })
  }
}