import { Webhook } from 'standardwebhooks'
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const webhook = new Webhook(process.env.DODO_PAYMENTS_WEBHOOK_KEY!)
  const rawBody = await request.text()
  const headersList = headers()

  const webhookHeaders = {
    'webhook-id': headersList.get('webhook-id') || '',
    'webhook-signature': headersList.get('webhook-signature') || '',
    'webhook-timestamp': headersList.get('webhook-timestamp') || '',
  }

  try {
    await webhook.verify(rawBody, webhookHeaders)
  } catch (err) {
    console.error('Dodo webhook signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(rawBody)
  console.log('FULL DODO PAYLOAD:', JSON.stringify(payload, null, 2))

  const eventType = payload.type || payload.event_type
  console.log('Resolved event type:', eventType)

  const data = payload.data

  // ── Active / Renewed ── set plan, save customer/subscription IDs
  if (
    eventType === 'subscription.active' ||
    eventType === 'subscription.renewed'
  ) {
    const userId = data?.metadata?.userId
      || data?.subscription?.metadata?.userId
      || payload.metadata?.userId

    const plan = data?.metadata?.plan
      || data?.subscription?.metadata?.plan
      || payload.metadata?.plan

    const customerId = data?.customer?.customer_id
      || data?.customer_id
      || data?.subscription?.customer?.customer_id

    const subscriptionId = data?.subscription_id
      || payload.data?.subscription_id
      || data?.subscription?.subscription_id

    console.log('Extracted:', { userId, plan, customerId, subscriptionId })

    if (!userId) {
      console.error('No userId in webhook metadata')
      return Response.json({ received: true })
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        // Step 2: 'pro' no longer exists; webhooks should send one of the
        // new tier names from the Dodo dashboard product mapping, but
        // fall back to 'starter' (the new mid-tier) if a legacy payload
        // arrives before the dashboard is fully updated.
        subscription_status: plan || 'starter',
        stripe_customer_id: customerId,
        subscription_id: subscriptionId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (error) {
      console.error('Supabase update failed:', error)
    } else {
      console.log(`Updated user ${userId} to plan ${plan}`)
    }
  }

  // ── On Hold ── payment failed on renewal, subscription paused
  // Don't downgrade — give a grace period. Log it so we can follow up.
  if (eventType === 'subscription.on_hold') {
    const customerId = data?.customer?.customer_id
    console.log('Subscription on hold — payment method needs updating for customer:', customerId)
    // Optionally: send email asking user to update payment method
  }

  // ── Cancelled / Expired / Failed ── downgrade to free
  if (
    eventType === 'subscription.cancelled' ||
    eventType === 'subscription.expired' ||
    eventType === 'subscription.failed'
  ) {
    const customerId = data?.customer?.customer_id

    await supabase
      .from('profiles')
      .update({
        subscription_status: 'free',
        subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('stripe_customer_id', customerId)
  }

  return Response.json({ received: true })
}