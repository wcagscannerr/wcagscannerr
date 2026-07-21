import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { PLANS } from '@/lib/dodo/plans';
import { z } from 'zod';

const generateSchema = z.object({
  scan_id: z.string().uuid(),
  product_name: z.string().min(1).max(200),
  product_version: z.string().max(50).optional(),
  product_description: z.string().max(1000).optional(),
  evaluator_name: z.string().min(1).max(200),
  evaluator_contact: z.string().max(200).optional(),
  standard: z.enum(['WCAG 2.1 AA', 'WCAG 2.1 A', 'WCAG 2.2 AA']).optional().default('WCAG 2.1 AA'),
});

export async function POST(request: NextRequest) {
  const authClient = await createClient();
  const db = createServiceClient();

  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Sign in required' }, { status: 401 });

  const { data: profile } = await db
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  const planId = profile?.subscription_status || 'free';
  if (!PLANS[planId as keyof typeof PLANS]?.limits.vpatGeneration) {
    return NextResponse.json(
      { error: 'VPAT / ACR generation is an Agency-plan exclusive feature. Upgrade to generate formal accessibility conformance reports for your clients.' },
      { status: 403 }
    );
  }

  const body = await request.json();
  const parsed = generateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { scan_id, ...fields } = parsed.data;

  const { data: scan } = await db
    .from('scans')
    .select('id, user_id, status')
    .eq('id', scan_id)
    .eq('user_id', user.id)
    .single();

  if (!scan) return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
  if (scan.status !== 'completed') {
    return NextResponse.json({ error: 'Scan must be completed before generating a VPAT from it' }, { status: 400 });
  }

  const { data: vpat, error } = await db
    .from('vpat_reports')
    .insert({
      user_id: user.id,
      scan_id,
      product_name: fields.product_name,
      product_version: fields.product_version || null,
      product_description: fields.product_description || null,
      evaluator_name: fields.evaluator_name,
      evaluator_contact: fields.evaluator_contact || null,
      standard: fields.standard,
      white_label: planId === 'agency',
    })
    .select('id')
    .single();

  if (error || !vpat) {
    console.error('Failed to create VPAT report:', error);
    return NextResponse.json({ error: 'Failed to create VPAT report' }, { status: 500 });
  }

  return NextResponse.json({ vpat_id: vpat.id });
}