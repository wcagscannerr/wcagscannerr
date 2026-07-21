-- Store the generated ACR (Accessibility Conformance Report) PDF URL
-- when a VPAT is finalized. The PDF is generated on-demand by the
-- /api/vpat/[id]/finalize route and uploaded to the scan-screenshots
-- bucket (reused for PDF storage), then the public URL is saved here.

ALTER TABLE vpat_reports ADD COLUMN IF NOT EXISTS acr_pdf_url TEXT;