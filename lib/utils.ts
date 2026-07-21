import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatDateShort(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

export function getScoreColor(score: number): string {
  if (score >= 90) return '#2DD4BF';
  if (score >= 75) return '#22D3A0';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

export function getScoreLabel(score: number): string {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Needs Work';
  return 'Poor';
}

export function getScoreTextColor(score: number): string {
  if (score >= 90) return 'text-[#2DD4BF]';
  if (score >= 75) return 'text-success';
  if (score >= 50) return 'text-warning';
  return 'text-danger';
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') return false;
    const privateRanges = ['10.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.', '192.168.'];
    for (const range of privateRanges) {
      if (parsed.hostname.startsWith(range)) return false;
    }
    // The URL constructor only validates URI *syntax* - it happily
    // accepts a hostname like "www.pw,live" (comma and all) as "valid"
    // because that's not illegal URI syntax, even though it can never
    // resolve as a real domain. Without this check, garbage URLs sailed
    // straight through to the scan engine and failed expensively (3x -
    // once per viewport) with a cryptic DNS error instead of being
    // rejected immediately with a clear "invalid URL" message.
    const validHostname = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
    if (!validHostname.test(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}