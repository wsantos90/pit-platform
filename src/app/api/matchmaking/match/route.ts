import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runMatching } from '@/lib/matchmaking/match';

const cronHeaderSchema = z.object({
  secret: z.string().trim().min(1),
});

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;
  const parsed = cronHeaderSchema.safeParse({
    secret: request.headers.get('x-cron-secret') ?? '',
  });

  if (!expectedSecret || !parsed.success || parsed.data.secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const matched = await runMatching();
    return NextResponse.json({ matched });
  } catch (err) {
    console.error('[Matchmaking/Match]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
