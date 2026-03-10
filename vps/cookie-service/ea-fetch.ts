import type { AkamaiCookieBundle } from './puppeteer';
import { buildEaMatchesUrl } from './puppeteer';

const DEFAULT_TIMEOUT_MS = toPositiveInt(process.env.EA_FETCH_TIMEOUT_MS, 25_000);
const DEFAULT_HEALTHCHECK_CLUB_ID = resolveHealthcheckClubId();

export type EaFetchResolvedBy = 'cache' | 'puppeteer' | 'browserless';

export type EaFetchStage =
  | 'cached_cookie'
  | 'puppeteer_renewal'
  | 'browserless_renewal'
  | 'healthcheck';

export type EaFetchFailureKind =
  | 'cookie_missing'
  | 'upstream_status'
  | 'invalid_json'
  | 'network_error';

export type EaFetchSuccess = {
  ok: true;
  matches: unknown;
  upstreamStatus: number;
  contentType: string | null;
};

export type EaFetchFailure = {
  ok: false;
  failureKind: EaFetchFailureKind;
  message: string;
  upstreamStatus: number | null;
  contentType: string | null;
  bodySnippet: string | null;
};

export type EaFetchResult = EaFetchSuccess | EaFetchFailure;

type FetchOptions = {
  maxResultCount?: number;
  matchType?: string;
};

function toPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function resolveHealthcheckClubId(): string {
  const configured = process.env.EA_HEALTHCHECK_CLUB_ID?.trim();
  if (configured) return configured;

  const targetUrl = process.env.EA_COOKIE_TARGET_URL;
  if (targetUrl) {
    try {
      const parsed = new URL(targetUrl);
      const fromUrl = parsed.searchParams.get('clubIds')?.trim();
      if (fromUrl) return fromUrl;
    } catch {
      // Ignore malformed env and keep fallback.
    }
  }

  return '1499996';
}

function sanitizeBodySnippet(body: string | null | undefined): string | null {
  if (!body) return null;
  const snippet = body.slice(0, 180).replace(/\s+/g, ' ').trim();
  return snippet.length > 0 ? snippet : null;
}

function buildCookieHeader(bundle: AkamaiCookieBundle): string {
  return `ak_bmsc=${bundle.ak_bmsc}; bm_sv=${bundle.bm_sv}`;
}

export function getEaHealthcheckClubId(): string {
  return DEFAULT_HEALTHCHECK_CLUB_ID;
}

export async function fetchEaMatchesWithCookieBundle(
  clubId: string,
  bundle: AkamaiCookieBundle | null,
  options: FetchOptions = {},
): Promise<EaFetchResult> {
  if (!bundle?.ak_bmsc?.trim() || !bundle?.bm_sv?.trim()) {
    return {
      ok: false,
      failureKind: 'cookie_missing',
      message: 'Nenhum bundle valido de ak_bmsc/bm_sv disponivel.',
      upstreamStatus: null,
      contentType: null,
      bodySnippet: null,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(buildEaMatchesUrl(clubId, options.maxResultCount, options.matchType), {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        Accept: 'application/json',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        Cookie: buildCookieHeader(bundle),
      },
      signal: controller.signal,
    });

    const contentType = response.headers.get('content-type');
    const bodyText = await response.text();

    if (!response.ok) {
      return {
        ok: false,
        failureKind: 'upstream_status',
        message: `EA API respondeu ${response.status} ${response.statusText}`.trim(),
        upstreamStatus: response.status,
        contentType,
        bodySnippet: sanitizeBodySnippet(bodyText),
      };
    }

    try {
      return {
        ok: true,
        matches: JSON.parse(bodyText),
        upstreamStatus: response.status,
        contentType,
      };
    } catch (error) {
      const parseMessage = error instanceof Error ? error.message : String(error);
      return {
        ok: false,
        failureKind: 'invalid_json',
        message: `EA API retornou JSON invalido: ${parseMessage}`,
        upstreamStatus: response.status,
        contentType,
        bodySnippet: sanitizeBodySnippet(bodyText),
      };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      failureKind: 'network_error',
      message,
      upstreamStatus: null,
      contentType: null,
      bodySnippet: null,
    };
  } finally {
    clearTimeout(timer);
  }
}
