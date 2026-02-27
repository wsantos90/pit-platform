import type { AkamaiCookieBundle } from './puppeteer';
import { logger } from './logger';
import { loadLatestCookiesRaw } from './storage';

type BrowserlessCookiePayload = {
  ak_bmsc?: string;
  bm_sv?: string;
  extracted_at?: string;
  valid_until?: string;
};

const TARGET_URL =
  process.env.EA_COOKIE_TARGET_URL ??
  'https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=1499996&maxResultCount=20&matchType=friendlyMatch';
const BOOTSTRAP_URL = process.env.EA_COOKIE_BOOTSTRAP_URL ?? toOrigin(TARGET_URL);
const FALLBACK_URL = process.env.BROWSERLESS_FALLBACK_URL ?? '';
const BROWSERLESS_BASE_URL = process.env.BROWSERLESS_BASE_URL ?? 'https://chrome.browserless.io';
const BROWSERLESS_TOKEN = process.env.BROWSERLESS_TOKEN ?? '';
const BROWSERLESS_ALLOW_NO_TOKEN = process.env.BROWSERLESS_ALLOW_NO_TOKEN === 'true';
const BROWSERLESS_STEALTH = (process.env.BROWSERLESS_STEALTH ?? 'true') === 'true';
const BROWSERLESS_BLOCK_ADS = (process.env.BROWSERLESS_BLOCK_ADS ?? 'false') === 'true';
const BROWSERLESS_TIMEOUT_MS = toPositiveInt(process.env.BROWSERLESS_TIMEOUT_MS, 30_000);
const COOKIE_TTL_MINUTES = toPositiveInt(process.env.AKAMAI_COOKIE_TTL_MINUTES, 30);

function toPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function toOrigin(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return 'https://proclubs.ea.com';
  }
}

function buildBundle(akBmsc: string, bmSv: string): AkamaiCookieBundle {
  const extractedAt = new Date();
  const validUntil = new Date(extractedAt.getTime() + COOKIE_TTL_MINUTES * 60_000);
  return {
    ak_bmsc: akBmsc,
    bm_sv: bmSv,
    extracted_at: extractedAt.toISOString(),
    valid_until: validUntil.toISOString(),
    source: 'browserless',
  };
}

function parsePayload(payload: unknown): BrowserlessCookiePayload {
  if (!payload || typeof payload !== 'object') return {};

  const p = payload as Record<string, unknown>;
  const direct: BrowserlessCookiePayload = {};
  if (typeof p.ak_bmsc === 'string' && p.ak_bmsc.trim().length > 0) direct.ak_bmsc = p.ak_bmsc;
  if (typeof p.bm_sv === 'string' && p.bm_sv.trim().length > 0) direct.bm_sv = p.bm_sv;
  if (typeof p.extracted_at === 'string' && p.extracted_at.trim().length > 0) direct.extracted_at = p.extracted_at;
  if (typeof p.valid_until === 'string' && p.valid_until.trim().length > 0) direct.valid_until = p.valid_until;

  if (direct.ak_bmsc && direct.bm_sv) return direct;

  if (p.result && typeof p.result === 'object') {
    const nested = parsePayload(p.result);
    if (nested.ak_bmsc && nested.bm_sv) return nested;
  }

  if (p.data && typeof p.data === 'object') {
    const nested = parsePayload(p.data);
    if (nested.ak_bmsc && nested.bm_sv) return nested;
  }

  return direct;
}

function toBundle(payload: BrowserlessCookiePayload): AkamaiCookieBundle | null {
  if (!payload.ak_bmsc?.trim() || !payload.bm_sv?.trim()) return null;

  const fallbackBundle = buildBundle(payload.ak_bmsc, payload.bm_sv);
  if (!payload.extracted_at || !payload.valid_until) return fallbackBundle;

  return {
    ak_bmsc: payload.ak_bmsc,
    bm_sv: payload.bm_sv,
    extracted_at: payload.extracted_at,
    valid_until: payload.valid_until,
    source: 'browserless',
  };
}

async function toBundleWithStoredFallback(payload: BrowserlessCookiePayload): Promise<AkamaiCookieBundle | null> {
  const hasAk = Boolean(payload.ak_bmsc?.trim());
  const hasBm = Boolean(payload.bm_sv?.trim());
  if (hasAk && hasBm) return toBundle(payload);
  if (!hasAk && !hasBm) return null;

  const latest = await loadLatestCookiesRaw();
  if (!latest) return null;

  const ak = payload.ak_bmsc?.trim() ? payload.ak_bmsc : latest.ak_bmsc;
  const bm = payload.bm_sv?.trim() ? payload.bm_sv : latest.bm_sv;
  if (!ak?.trim() || !bm?.trim()) return null;

  logger.warn('browserless_partial_cookie_merged', {
    event: 'browserless_partial_cookie_merged',
    got_ak_from_browserless: hasAk,
    got_bm_from_browserless: hasBm,
    merged_with_storage: true,
  });

  return buildBundle(ak, bm);
}

function parseJsonText(body: string, source: string): unknown {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error(`[cookie-service] ${source} retornou body vazio.`);
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    throw new Error(`[cookie-service] ${source} retornou JSON invalido: ${err}.`);
  }
}

async function fetchFromCustomFallbackUrl(): Promise<AkamaiCookieBundle | null> {
  if (!FALLBACK_URL) return null;
  logger.info('browserless_custom_fallback_start', {
    event: 'browserless_custom_fallback_start',
    has_token: Boolean(BROWSERLESS_TOKEN),
  });

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (BROWSERLESS_TOKEN) {
    headers.Authorization = `Bearer ${BROWSERLESS_TOKEN}`;
    headers['x-token'] = BROWSERLESS_TOKEN;
  }

  const response = await fetch(FALLBACK_URL, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[cookie-service] Fallback URL falhou (${response.status}): ${body}`);
  }

  const text = await response.text();
  const payload = parsePayload(parseJsonText(text, 'fallback_url'));
  return toBundle(payload);
}

async function fetchFromBrowserlessFunctionApi(): Promise<AkamaiCookieBundle | null> {
  if (!BROWSERLESS_TOKEN && !BROWSERLESS_ALLOW_NO_TOKEN) return null;
  logger.info('browserless_function_start', {
    event: 'browserless_function_start',
    base_url: BROWSERLESS_BASE_URL,
    stealth: BROWSERLESS_STEALTH,
    block_ads: BROWSERLESS_BLOCK_ADS,
    allow_no_token: BROWSERLESS_ALLOW_NO_TOKEN,
  });

  const query = new URLSearchParams();
  if (BROWSERLESS_TOKEN) query.set('token', BROWSERLESS_TOKEN);
  query.set('stealth', String(BROWSERLESS_STEALTH));
  query.set('blockAds', String(BROWSERLESS_BLOCK_ADS));
  const endpoint = `${BROWSERLESS_BASE_URL.replace(/\/+$/, '')}/function?${query.toString()}`;
  const code = `
module.exports = async ({ page, context }) => {
  const targetUrl = context.targetUrl;
  const bootstrapUrl = context.bootstrapUrl || targetUrl;
  const timeoutMs = Number(context.timeoutMs || 30000);
  const parseSetCookie = (raw) => {
    const out = {};
    if (typeof raw !== 'string' || !raw.trim()) return out;
    const ak = raw.match(/ak_bmsc=([^;\\r\\n]+)/i);
    const bm = raw.match(/bm_sv=([^;\\r\\n]+)/i);
    if (ak && ak[1] && ak[1].trim()) out.ak_bmsc = ak[1].trim();
    if (bm && bm[1] && bm[1].trim()) out.bm_sv = bm[1].trim();
    return out;
  };
  const observed = {};
  page.on('response', async (response) => {
    try {
      const headers = await response.headers();
      const fromHeader = parseSetCookie(String(headers['set-cookie'] || ''));
      if (fromHeader.ak_bmsc) observed.ak_bmsc = fromHeader.ak_bmsc;
      if (fromHeader.bm_sv) observed.bm_sv = fromHeader.bm_sv;
    } catch (_) {}
  });

  const map = {};
  const collectCookies = async () => {
    const cookies = await page.cookies();
    for (const cookie of cookies) {
      if ((cookie.name === 'ak_bmsc' || cookie.name === 'bm_sv') && cookie.value) {
        map[cookie.name] = cookie.value;
      }
    }
    if (!map.ak_bmsc && observed.ak_bmsc) map.ak_bmsc = observed.ak_bmsc;
    if (!map.bm_sv && observed.bm_sv) map.bm_sv = observed.bm_sv;
  };

  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36');

  const sequence =
    targetUrl === bootstrapUrl
      ? [bootstrapUrl, bootstrapUrl]
      : [bootstrapUrl, targetUrl, bootstrapUrl, targetUrl];
  for (const url of sequence) {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs });
    await page.waitForSelector('body', { timeout: Math.min(timeoutMs, 10000) });
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await collectCookies();
    if (map.ak_bmsc && map.bm_sv) break;
  }

  const startedAt = Date.now();
  while (!(map.ak_bmsc && map.bm_sv) && Date.now() - startedAt < timeoutMs) {
    try {
      await page.goto(targetUrl, { waitUntil: 'networkidle2', timeout: timeoutMs });
      await page.waitForSelector('body', { timeout: Math.min(timeoutMs, 10000) });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (_) {}
    await collectCookies();
    if (map.ak_bmsc && map.bm_sv) break;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }

  return {
    data: map,
    type: 'application/json',
  };
};`;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code,
      context: {
        targetUrl: TARGET_URL,
        bootstrapUrl: BOOTSTRAP_URL,
        timeoutMs: BROWSERLESS_TIMEOUT_MS,
      },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[cookie-service] Browserless function falhou (${response.status}): ${body}`);
  }

  const text = await response.text();
  const payload = parsePayload(parseJsonText(text, 'browserless_function'));
  const bundle = toBundle(payload);
  if (bundle) return bundle;
  const mergedBundle = await toBundleWithStoredFallback(payload);
  if (mergedBundle) return mergedBundle;

  const keys = Object.keys(payload ?? {});
  throw new Error(
    `[cookie-service] Browserless function nao retornou ak_bmsc/bm_sv. keys=${keys.length > 0 ? keys.join(',') : 'none'}.`,
  );
}

export function isBrowserlessConfigured(): boolean {
  return Boolean(FALLBACK_URL || BROWSERLESS_TOKEN || BROWSERLESS_ALLOW_NO_TOKEN);
}

export async function fetchBrowserlessCookieBundle(): Promise<AkamaiCookieBundle> {
  const customBundle = await fetchFromCustomFallbackUrl();
  if (customBundle) return customBundle;

  const functionBundle = await fetchFromBrowserlessFunctionApi();
  if (functionBundle) return functionBundle;

  throw new Error(
    '[cookie-service] Browserless nao configurado (defina BROWSERLESS_FALLBACK_URL, BROWSERLESS_TOKEN ou BROWSERLESS_ALLOW_NO_TOKEN=true).',
  );
}
