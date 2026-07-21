import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// TEMPORARY — delete this file once the CRON_SECRET mismatch is sorted out.
// Never leaves the full secret in the response, just enough shape info
// (length + first/last 2 chars) to tell whether the env var is even set,
// and whether what you're sending actually matches what Vercel has.
export async function GET(request: NextRequest) {
  const envSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const sentToken = authHeader?.replace(/^Bearer\s+/i, '') ?? null

  const shape = (s: string | null | undefined) =>
    s ? { length: s.length, starts: s.slice(0, 2), ends: s.slice(-2), hasWhitespace: /\s/.test(s) } : null

  return NextResponse.json({
    envSecretIsSet: !!envSecret,
    envSecretShape: shape(envSecret),
    receivedAuthHeaderRaw: authHeader,
    receivedTokenShape: shape(sentToken),
    exactMatch: !!envSecret && !!sentToken && envSecret === sentToken,
  })
}