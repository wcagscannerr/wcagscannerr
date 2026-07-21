import dns from 'node:dns/promises'
import net from 'node:net'

// ──────────────────────────────────────────────────────────────────────────
// SSRF guard — DNS-aware
//
// Pre-Step 7 this file only validated the hostname string. That left us
// wide open to DNS rebinding: a hostname like "evil.example.com" passes
// the string check fine, but it's free to resolve to 127.0.0.1 from the
// server-side resolver, giving the exact attack the string check was
// supposed to prevent.
//
// Step 7: resolve the hostname via DNS and check every resulting IP
// against a much wider range of blocked addresses — both IPv4 (RFC 1918,
// CGNAT, loopback, link-local / cloud-metadata, multicast, benchmark,
// reserved) and IPv6 (ULA, link-local, multicast, loopback, IP/IPv6
// translation). The DNS-resolution failure case is treated as
// "unsafe" — a public SSRF-scanner where the worst case is letting an
// attacker reach internal hosts has to err on the side of refusing.
// ──────────────────────────────────────────────────────────────────────────

const BLOCKED_HOSTNAMES = [
  'localhost', '127.0.0.1', '0.0.0.0', '::1',
]

// node:net.BlockList is the right primitive here. It handles IPv4 vs
// IPv6 family detection automatically, and Node treats IPv4-mapped
// IPv6 addresses (::ffff:127.0.0.1) as the underlying IPv4 when you
// call .check() on them — so a hostname that rebinds to
// ::ffff:10.0.0.1 trips the IPv4 10.0.0.0/8 rule without us having to
// strip the mapping manually.
const blockList = new net.BlockList()

// ── IPv4 ranges ──
// Unspecified (RFC 1122)
blockList.addSubnet('0.0.0.0', 8, 'ipv4')
// Loopback (RFC 1122)
blockList.addSubnet('127.0.0.0', 8, 'ipv4')
// Private Class A (RFC 1918)
blockList.addSubnet('10.0.0.0', 8, 'ipv4')
// Private Class B (RFC 1918)
blockList.addSubnet('172.16.0.0', 12, 'ipv4')
// Private Class C (RFC 1918)
blockList.addSubnet('192.168.0.0', 16, 'ipv4')
// Link-local / AWS/GCP/Azure cloud metadata endpoints (RFC 3927)
blockList.addSubnet('169.254.0.0', 16, 'ipv4')
// Carrier-grade NAT (RFC 6598)
blockList.addSubnet('100.64.0.0', 10, 'ipv4')
// Benchmark testing (RFC 2544)
blockList.addSubnet('198.18.0.0', 15, 'ipv4')
// Multicast (RFC 5771)
blockList.addSubnet('224.0.0.0', 4, 'ipv4')
// Reserved / future use (RFC 1112 §4)
blockList.addSubnet('240.0.0.0', 4, 'ipv4')

// ── IPv6 ranges ──
// Unspecified
blockList.addAddress('::', 'ipv6')
// Loopback
blockList.addAddress('::1', 'ipv6')
// Unique-local addresses, RFC 4193 — IPv6 equivalent of RFC 1918
blockList.addSubnet('fc00::', 7, 'ipv6')
// Link-local
blockList.addSubnet('fe80::', 10, 'ipv6')
// Multicast
blockList.addSubnet('ff00::', 8, 'ipv6')
// IP/IPv6 translation prefix (RFC 6052) — covers ::ffff:0:0/96
// transit forms in addition to the automatic IPv4 mapping.
blockList.addSubnet('64:ff9b::', 96, 'ipv6')

function isAddressBlocked(ip: string): boolean {
  const family = net.isIP(ip)
  if (family === 0) return false
  return blockList.check(ip, family === 4 ? 'ipv4' : 'ipv6')
}

interface ResolveResult {
  safe: boolean
  reason?: string
  resolvedIps?: string[]
}

/**
 * Resolve a hostname to its real DNS answer(s) and check each for being
 * in the block list.
 *
 * RESIDUAL DNS-REBINDING WINDOW — accepted explicitly.
 * The validity of any answer returned here expires the instant we
 * return. Between this check and the later page.goto() call inside
 * Puppeteer, the authoritative DNS answer for this hostname could
 * change — that is the classic DNS-rebinding attack. We accept this
 * residual risk because:
 *   (a) The window is short — typically tens of milliseconds in
 *       practice and bounded by the user submitting one URL + the
 *       queue/job pickup time.
 *   (b) Re-resolving from inside the spawned browser process is racy
 *       by construction — puppeteer-core connects from inside the
 *       Chromium renderer, and that process uses its own DNS path
 *       (DoH in modern Chromium), not Node's.
 *   (c) Vercel's outbound network firewall adds an infrastructure-
 *       layer backstop that blocks requests to VPC / metadata IPs
 *       even if a rebinding race were to win.
 * For high-security deployments, layer a separate control (e.g. an
 * egress deny-list at the infrastructure level) rather than trying to
 * "fix" this at the application layer.
 *
 * DNS resolution failure is treated as UNSAFE — for an SSRF-scanner
 * where the worst case is letting an attacker reach internal hosts,
 * defaulting to "safe" on resolution failure would let attackers probe
 * internal hosts by picking names that fail to resolve from our side.
 */
async function resolveAndCheckHost(hostname: string): Promise<ResolveResult> {
  let resolvedIps: string[]
  try {
    const lookups = await dns.lookup(hostname, { all: true, verbatim: true })
    resolvedIps = lookups.map((l) => l.address)
    if (resolvedIps.length === 0) {
      return { safe: false, reason: 'Hostname could not be resolved' }
    }
  } catch {
    return { safe: false, reason: 'DNS resolution failed' }
  }

  for (const ip of resolvedIps) {
    if (isAddressBlocked(ip)) {
      return {
        safe: false,
        reason: `Hostname resolves to a blocked address (${ip})`,
        resolvedIps,
      }
    }
  }

  return { safe: true, resolvedIps }
}

/**
 * SSRF guard: validate a URL is safe to navigate.
 *
 * Resolves the hostname via DNS and rejects any address that falls in
 * a private/blocked range — defeating DNS-rebinding attacks where the
 * hostname string passes a check but the actual IP it resolves to is
 * internal.
 *
 * See {@link resolveAndCheckHost} for the documented residual
 * DNS-rebinding window — we accept and document it rather than try
 * to close the small race at the application layer.
 *
 * Return shape is additive — callers that ignored the `resolvedIps`
 * field on the previous (sync) version still work.
 */
export async function isUrlSafe(inputUrl: string): Promise<{
  safe: boolean
  reason?: string
  resolvedIps?: string[]
}> {
  let parsed: URL
  try {
    parsed = new URL(inputUrl)
  } catch {
    return { safe: false, reason: 'Invalid URL format' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: 'Only HTTP/HTTPS URLs are allowed' }
  }

  const hostname = parsed.hostname.toLowerCase()

  // Layer 1: literal hostname-string check (catches "localhost" early
  // without a DNS round-trip).
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    return { safe: false, reason: 'Cannot scan internal/local addresses' }
  }

  // Layer 2: literal IP — no DNS needed, just block-range check.
  // This catches e.g. "10.0.0.5" or "::ffff:127.0.0.1" as inputs
  // directly without a resolver round-trip.
  const literalFamily = net.isIP(hostname)
  if (literalFamily !== 0) {
    if (isAddressBlocked(hostname)) {
      return { safe: false, reason: 'Cannot scan private/internal IP ranges' }
    }
    return { safe: true, resolvedIps: [hostname] }
  }

  // Layer 3: full DNS resolve + check every answer in the block list.
  return await resolveAndCheckHost(hostname)
}
