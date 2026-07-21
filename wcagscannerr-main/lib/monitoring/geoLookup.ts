import dns from 'node:dns/promises'

export interface GeoResult {
  lat: number
  lng: number
  country: string
  city: string | null
}

/** RFC 1918 / loopback / link-local ranges — resolving these is expected
 * (local dev, internal tools) but there is no meaningful public
 * geolocation for them, and querying an external API with a private IP
 * is pointless and occasionally flagged as abuse by the API provider. */
function isPrivateIp(ip: string): boolean {
  return (
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    ip.startsWith('127.') ||
    ip.startsWith('169.254.') ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip) ||
    ip === '::1'
  )
}

async function resolveHostIp(hostname: string): Promise<string | null> {
  try {
    const result = await dns.lookup(hostname, { family: 4 })
    return result.address
  } catch {
    return null
  }
}

/**
 * Looks up the real, current hosting location for a monitored site's URL.
 * Returns null if the lookup fails for any reason (DNS failure, private IP,
 * API error, timeout) — callers should treat null as "location unknown",
 * never fall back to a guessed or default location. That's the whole
 * point: an honest "we don't know" beats a plausible-looking fabrication.
 */
export async function lookupSiteGeo(url: string): Promise<GeoResult | null> {
  let hostname: string
  try {
    hostname = new URL(url).hostname
  } catch {
    return null
  }

  const ip = await resolveHostIp(hostname)
  if (!ip || isPrivateIp(ip)) return null

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    // ipwho.is: free, no API key or signup required, HTTPS supported.
    // No SLA guarantee — if it's ever down or rate-limited, this whole
    // function just returns null and the site shows as "Location unknown"
    // rather than the app silently breaking or making something up.
    const res = await fetch(`https://ipwho.is/${ip}`, { signal: controller.signal })
    clearTimeout(timeout)

    if (!res.ok) return null
    const data = await res.json()

    if (!data.success || typeof data.latitude !== 'number' || typeof data.longitude !== 'number') {
      return null
    }

    return {
      lat: data.latitude,
      lng: data.longitude,
      country: data.country || 'Unknown',
      city: data.city || null,
    }
  } catch {
    return null
  }
}