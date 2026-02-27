import { NextRequest, NextResponse } from 'next/server';
import { fetchAkamaiCookies, isCookieServiceConfigured } from '@/lib/ea/cookieClient';

/**
 * GET /api/ea/cookie
 *
 * Proxy interno: busca cookies Akamai válidos do Cookie Service na VPS.
 * Usado pelo n8n e por outros processos internos para obter cookies frescos.
 *
 * Autenticação: x-webhook-secret (mesmo secret das demais rotas internas)
 */
export async function GET(request: NextRequest) {
  const webhookSecret = request.headers.get('x-webhook-secret');
  const expectedSecret = process.env.N8N_WEBHOOK_SECRET;

  if (!expectedSecret || webhookSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isCookieServiceConfigured()) {
    return NextResponse.json(
      { error: 'Cookie service not configured', hint: 'Define COOKIE_SERVICE_URL no .env' },
      { status: 503 }
    );
  }

  try {
    const cookieHeader = await fetchAkamaiCookies();
    return NextResponse.json({ cookie: cookieHeader });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[/api/ea/cookie] Falha ao buscar cookies: ${message}`);
    return NextResponse.json(
      { error: 'cookie_unavailable', message },
      { status: 503 }
    );
  }
}
