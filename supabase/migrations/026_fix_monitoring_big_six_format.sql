-- ================================================
-- Fix big_six format in scan records from monitoring
-- The monitoring worker was storing big_six as an array
-- [{ruleId, instances}] but the frontend expects a flat
-- object {contrast, alt_text, labels, links, buttons, lang}.
-- ================================================

-- Fix records where big_six is an array (wrong format)
UPDATE scans
SET big_six = '{"contrast":0,"alt_text":0,"labels":0,"links":0,"buttons":0,"lang":0}'::jsonb
WHERE big_six IS NOT NULL 
  AND jsonb_typeof(big_six) = 'array';
