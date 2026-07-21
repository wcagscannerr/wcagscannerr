import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { z } from 'zod';

const subscribeSchema = z.object({
  email: z.string().email('Invalid email address'),
  source: z.string().optional().default('free_scan'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = subscribeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    const { email, source } = parsed.data;
    const db = createServiceClient();

    console.log('Subscribe attempt:', email);
    const { data, error } = await db
      .from('newsletter_subscribers')
      .insert({ email, source });
    console.log('Insert result:', { data, error });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'Already subscribed' },
          { status: 200 }
        );
      }
      console.error('Subscribe error:', error);
      return NextResponse.json(
        { error: 'Failed to subscribe' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Subscribed successfully' });
  } catch (err) {
    console.error('Subscribe error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}