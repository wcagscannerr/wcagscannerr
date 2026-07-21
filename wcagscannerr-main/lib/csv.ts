/**
 * Proper CSV cell/row escaping per RFC 4180.
 *
 * This exists because app/api/reports/[id]/csv/route.ts was previously
 * running every cell through lib/escapeHtml.ts — which is an HTML
 * escaper (converts " -> &quot;, & -> &amp;, etc.), not a CSV escaper.
 * That corrupts any violation description/element HTML containing
 * &, <, >, ', or " (garbled entities instead of the real characters),
 * and skips the actual CSV rule that matters: doubling internal quotes.
 *
 * Use csvCell()/toCsv() instead of escapeHtml() anywhere you're building
 * a CSV file.
 */

export function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  // RFC 4180: escape a literal double-quote by doubling it, and always
  // wrap the cell in quotes so embedded commas/newlines/quotes are safe.
  return `"${str.replace(/"/g, '""')}"`
}

export function toCsv(rows: string[][]): string {
  // UTF-8 BOM so Excel (Windows in particular) auto-detects the encoding
  // instead of defaulting to a legacy codepage and mangling special
  // characters like curly quotes, em dashes, or non-Latin text.
  const BOM = '\uFEFF'
  return BOM + rows.map(row => row.map(csvCell).join(',')).join('\r\n')
}