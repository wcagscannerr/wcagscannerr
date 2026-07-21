-- The annotated screenshot's markers are indexed by each violation's
-- position in the array at scan time (0, 1, 2...). The report page,
-- however, queries violations ordered by impact for display purposes —
-- a different order. Without a stable key, marker.index no longer lines
-- up with the violation it was computed for. sort_order preserves the
-- original scan-time order so the two can be joined correctly.
ALTER TABLE violations ADD COLUMN sort_order INT DEFAULT 0;
CREATE INDEX idx_violations_scan_sort ON violations(scan_id, sort_order);