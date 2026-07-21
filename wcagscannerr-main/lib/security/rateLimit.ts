import { createServiceClient } from '@/lib/supabase/server'

export async function checkRateLimit(
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = createServiceClient()
  const windowStart = new Date(Date.now() - windowMinutes * 60000).toISOString()

  const { data } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('identifier', identifier)
    .eq('action', action)
    .single()

  if (!data || data.window_start < windowStart) {
    await supabase.from('rate_limits').upsert(
      { identifier, action, count: 1, window_start: new Date().toISOString() },
      { onConflict: 'identifier,action' }
    )
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  if (data.count >= maxAttempts) {
    return { allowed: false, remaining: 0 }
  }

  await supabase
    .from('rate_limits')
    .update({ count: data.count + 1 })
    .eq('identifier', identifier)
    .eq('action', action)

  return { allowed: true, remaining: maxAttempts - data.count - 1 }
}