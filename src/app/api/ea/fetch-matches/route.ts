import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchMatches } from '@/lib/ea/api';
import { tryFetchAkamaiCookies } from '@/lib/ea/cookieClient';

const fetchMatchesSchema = z.object({
  clubId: z.string().trim().min(1, 'clubId is required'),
  cookies: z.string().trim().min(1).optional(),
});

export async function POST(request: NextRequest) {
  // Autenticação via webhook secret (usado pelo n8n e admin interno)
  const webhookSecret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!expectedSecret || webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = fetchMatchesSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // Se cookies não foram fornecidos pelo caller, busca automaticamente do cookie service
  const cookies = parsed.data.cookies ?? (await tryFetchAkamaiCookies()) ?? undefined;

  try {
    const matches = await fetchMatches(parsed.data.clubId, cookies);
    return NextResponse.json({ matches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 502 }
    );
  }
}
