import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: reports, error } = await supabase
      .from('reports')
      .select(`
        id,
        scan_id,
        user_id,
        name,
        pdf_url,
        is_public,
        public_token,
        created_at,
        scans:scan_id (
          url,
          status,
          compliance_score,
          total_violations,
          critical_count,
          serious_count,
          moderate_count,
          minor_count,
          wcag_level,
          completed_at,
          created_at
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
    }

    return NextResponse.json({ reports: reports || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { scan_id, name, is_public } = body;

    if (!scan_id) {
      return NextResponse.json({ error: 'scan_id is required' }, { status: 400 });
    }

    // Verify user owns the scan
    const { data: scan } = await supabase
      .from('scans')
      .select('user_id')
      .eq('id', scan_id)
      .single();

    if (!scan || scan.user_id !== user.id) {
      return NextResponse.json({ error: 'Scan not found or unauthorized' }, { status: 404 });
    }

    const publicToken = is_public ? `pub_${crypto.randomUUID().slice(0, 12)}` : null;

    const { data: report, error } = await supabase
      .from('reports')
      .insert({
        scan_id,
        user_id: user.id,
        name: name || null,
        is_public: is_public || false,
        public_token: publicToken,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    return NextResponse.json({ report });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Server error' }, { status: 500 });
  }
}