import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `https://${request.headers.get('host')}`;
    const headers = {
      'Content-Type': 'application/json',
      'x-cron-secret': parsed.data.secret,
    };

    // Run expire first, then match
    const [expireRes, matchRes] = await Promise.all([
      fetch(`${baseUrl}/api/matchmaking/expire`, { method: 'POST', headers }),
      fetch(`${baseUrl}/api/matchmaking/match`, { method: 'POST', headers }),
    ]);

    const expireData = expireRes.ok ? await expireRes.json() : { error: 'expire failed' };
    const matchData = matchRes.ok ? await matchRes.json() : { error: 'match failed' };

    return NextResponse.json({
      expired: expireData.expired ?? 0,
      matched: matchData.matched ?? 0,
      errors: {
        expire: expireData.error ?? null,
        match: matchData.error ?? null,
      },
    });
  } catch (err) {
    console.error('[Cron/Matchmaking]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
