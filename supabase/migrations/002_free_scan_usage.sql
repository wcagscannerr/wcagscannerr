-- Free scan usage tracking table
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS free_scan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  url TEXT
);

CREATE INDEX IF NOT EXISTS idx_free_scan_ip ON free_scan_usage(ip_address);