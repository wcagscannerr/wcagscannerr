-- Persist the true number of DOM elements affected by each violation rule.
-- axe-core groups every failing element for a rule into one violation
-- object; without storing the real count separately, a report showing
-- "color-contrast: 1 violation" gives no indication that it might
-- actually be failing on 60 different elements across the page. This is
-- the same fix applied to scoring in lib/scanner/engine.ts — this column
-- lets the report UI show "affects 60 elements" per violation card.
ALTER TABLE violations ADD COLUMN node_count INT DEFAULT 1;

-- axe-core's own WCAG success-criterion tags per rule (e.g. "wcag111",
-- "wcag143"). This is the authoritative mapping used by VPAT generation
-- to determine per-criterion conformance — see lib/vpat/.
ALTER TABLE violations ADD COLUMN tags TEXT[];