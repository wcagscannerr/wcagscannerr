/**
 * Escape HTML entities to prevent HTML injection when inserting
 * untrusted text (violation descriptions, axe-core rule text,
 * scanned page HTML) into HTML template strings.
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return ''
  const amp = String.fromCharCode(38)
  return String(text)
    .replace(/&/g, amp + 'amp;')
    .replace(/</g, amp + 'lt;')
    .replace(/>/g, amp + 'gt;')
    .replace(/"/g, amp + 'quot;')
    .replace(/'/g, amp + '#039;')
}