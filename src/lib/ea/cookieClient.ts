/**
 * Cookie Client — Integração com o Cookie Service (VPS)
 *
 * Busca cookies Akamai válidos (ak_bmsc + bm_sv) do microserviço na VPS.
 * Retorna string no formato Cookie header: "ak_bmsc=<val>; bm_sv=<val>"
 *
 * Variáveis de ambiente:
 *   COOKIE_SERVICE_URL    — URL base do serviço, ex: https://cookie.menteembeta.com.br
 *   COOKIE_SERVICE_SECRET — Valor do header x-secret
 */

const COOKIE_SERVICE_URL = (process.env.COOKIE_SERVICE_URL ?? '').replace(/\/+$/, '');
const COOKIE_SERVICE_SECRET = process.env.COOKIE_SERVICE_SECRET ?? '';

/** Resposta do endpoint GET /api/cookies do cookie service */
type CookieServiceResponse = {
  ak_bmsc: string;
  bm_sv: string;
  source: 'puppeteer' | 'browserless';
  extracted_at: string;
  valid_until: string;
  resolved_by: 'cache' | 'puppeteer' | 'browserless';
};

/**
 * Retorna true se o cookie service está configurado (URL definida).
 * Usado para decidir se vale a pena tentar buscar cookies.
 */
export function isCookieServiceConfigured(): boolean {
  return COOKIE_SERVICE_URL.length > 0;
}

/**
 * Busca cookies Akamai do serviço na VPS.
 *
 * @returns Cookie header string: "ak_bmsc=<val>; bm_sv=<val>"
 * @throws Error se o serviço não estiver configurado ou retornar erro
 */
export async function fetchAkamaiCookies(): Promise<string> {
  if (!isCookieServiceConfigured()) {
    throw new Error('[cookieClient] COOKIE_SERVICE_URL nao configurada.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);

  let response: Response;
  try {
    response = await fetch(`${COOKIE_SERVICE_URL}/api/cookies`, {
      method: 'GET',
      headers: {
        'x-secret': COOKIE_SERVICE_SECRET,
        Accept: 'application/json',
      },
      signal: controller.signal,
      // Sem cache — sempre queremos cookies frescos
      cache: 'no-store',
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[cookieClient] Cookie service retornou ${response.status}: ${body}`);
  }

  const data = (await response.json()) as CookieServiceResponse;

  if (!data.ak_bmsc?.trim() || !data.bm_sv?.trim()) {
    throw new Error('[cookieClient] Cookie service retornou cookies vazios.');
  }

  return `ak_bmsc=${data.ak_bmsc}; bm_sv=${data.bm_sv}`;
}

/**
 * Versão segura: tenta buscar cookies, retorna null em caso de falha.
 * Use quando cookies são opcionais (sem cookies a API EA pode funcionar
 * mas com mais chance de rate-limit/bloqueio).
 */
export async function tryFetchAkamaiCookies(): Promise<string | null> {
  if (!isCookieServiceConfigured()) return null;

  try {
    return await fetchAkamaiCookies();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[cookieClient] Falha ao buscar cookies Akamai (continuando sem cookies): ${message}`);
    return null;
  }
}
