export interface Report {
  id: string;
  scan_id: string;
  user_id: string;
  name: string | null;
  pdf_url: string | null;
  is_public: boolean;
  public_token: string | null;
  created_at: string;
}

export interface ReportWithScan extends Report {
  scan: {
    url: string;
    status: string;
    compliance_score: number | null;
    total_violations: number;
    critical_count: number;
    serious_count: number;
    moderate_count: number;
    minor_count: number;
    wcag_level: string;
    completed_at: string | null;
    created_at: string;
  };
}