// Step 2: subscription_status enum on profiles is now free/starter/growth/enterprise.
// Pre-launch — no live customers — so the old pro/agency union members are dropped.
export type SubscriptionTier = 'free' | 'starter' | 'growth' | 'enterprise';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          stripe_customer_id: string | null;
          subscription_status: SubscriptionTier;
          subscription_id: string | null;
          current_period_end: string | null;
          // Step 4: scans_used_this_month was dropped. SUM(delta) from
          // scan_credits_ledger is now the source of truth for usage.
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          // Default on the server stays 'free' — the new tiers are writeable
          // through the Dodo webhook only.
          subscription_status?: SubscriptionTier;
        };
        Update: {
          full_name?: string | null;
          avatar_url?: string | null;
          stripe_customer_id?: string | null;
          subscription_status?: SubscriptionTier;
          subscription_id?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
      };
      scans: {
        Row: {
          id: string;
          user_id: string;
          url: string;
          status: string;
          pages_scanned: number;
          pages_requested: number;
          compliance_score: number | null;
          total_violations: number;
          critical_count: number;
          serious_count: number;
          moderate_count: number;
          minor_count: number;
          wcag_level: string;
          big_six: Record<string, number> | null;
          error_message: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
      };
      // Step 10 — per-(user, stable_key) status returned
      // for the same issue across scans.
      violation_status: {
        Row: {
          id: string;
          user_id: string;
          stable_key: string;
          status: 'open' | 'fixed' | 'false_positive' | 'in_progress';
          notes: string | null;
          metadata: Record<string, unknown>;
          first_marked_scan_id: string | null;
          last_seen_scan_id: string | null;
          auto_resolved_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          stable_key: string;
          status?: 'open' | 'fixed' | 'false_positive' | 'in_progress';
          notes?: string | null;
          metadata?: Record<string, unknown>;
          first_marked_scan_id?: string | null;
          last_seen_scan_id?: string | null;
          auto_resolved_count?: number;
        };
        Update: Partial<{
          status: 'open' | 'fixed' | 'false_positive' | 'in_progress';
          notes: string | null;
          metadata: Record<string, unknown>;
          last_seen_scan_id: string | null;
          auto_resolved_count: number;
          updated_at: string;
        }>;
      };
    };
  };
}
