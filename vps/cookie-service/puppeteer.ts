type AkamaiCookieName = 'ak_bmsc' | 'bm_sv';

import { errorContext, logger } from './logger';

type Browser = {
  newPage: () => Promise<Page>;
  close: () => Promise<void>;
};

type Cookie = {
  name: string;
  value: string;
};

type Page = {
  setUserAgent: (userAgent: string) => Promise<void>;
  setExtraHTTPHeaders: (headers: Record<string, string>) => Promise<void>;
  authenticate: (credentials: { username: string; password: string }) => Promise<void>;
  setDefaultNavigationTimeout: (timeout: number) => void;
  setDefaultTimeout: (timeout: number) => void;
  goto: (
    url: string,
    options: { waitUntil: 'domcontentloaded' | 'networkidle0' | 'networkidle2'; timeout: number },
  ) => Promise<void>;
  waitForSelector: (selector: string, options: { timeout: number }) => Promise<void>;
  evaluateOnNewDocument: (fn: string) => Promise<void>;
  evaluate: <T>(fn: (...args: unknown[]) => T | Promise<T>, ...args: unknown[]) => Promise<T>;
  cookies: () => Promise<Cookie[]>;
  setCookie: (...cookies: Array<{ name: string; value: string; url: string }>) => Promise<void>;
  on: (event: 'response', listener: (response: HttpResponse) => void | Promise<void>) => void;
};

type HttpResponse = {
  headers: () => Record<string, string>;
};

type PuppeteerModule = {
  launch: (options: {
    headless: boolean;
    executablePath?: string;
    args: string[];
    timeout: number;
    protocolTimeout: number;
    ignoreHTTPSErrors?: boolean;
  }) => Promise<Browser>;
};

const AKAMAI_COOKIE_NAMES: AkamaiCookieName[] = ['ak_bmsc', 'bm_sv'];
const DEFAULT_TARGET_URL =
  process.env.EA_COOKIE_TARGET_URL ??
  'https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=1499996&maxResultCount=20&matchType=friendlyMatch';
const DEFAULT_BOOTSTRAP_URL = process.env.EA_COOKIE_BOOTSTRAP_URL ?? toOrigin(DEFAULT_TARGET_URL);
const DEFAULT_TIMEOUT_MS = toPositiveInt(process.env.PUPPETEER_TIMEOUT_MS, 60_000);
const DEFAULT_MAX_ATTEMPTS = toPositiveInt(process.env.PUPPETEER_MAX_ATTEMPTS, 2);
const DEFAULT_COOKIE_TTL_MINUTES = toPositiveInt(process.env.AKAMAI_COOKIE_TTL_MINUTES, 30);
const DEFAULT_MAX_RESULT_COUNT = toPositiveInt(process.env.EA_MAX_RESULT_COUNT, 10);
const DEFAULT_PLATFORM = process.env.EA_PLATFORM ?? 'common-gen5';
const DEFAULT_MATCH_TYPE = process.env.EA_MATCH_TYPE ?? 'friendlyMatch';
const POLL_INTERVAL_MS = 500;
const RAW_PROXY_URL = (process.env.PUPPETEER_PROXY_URL ?? '').trim();
const PROXY_USERNAME = (process.env.PUPPETEER_PROXY_USERNAME ?? '').trim();
const PROXY_PASSWORD = process.env.PUPPETEER_PROXY_PASSWORD ?? '';
const IGNORE_HTTPS_ERRORS = (process.env.PUPPETEER_IGNORE_HTTPS_ERRORS ?? 'false') === 'true';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
] as const;

export type AkamaiCookieBundle = {
  ak_bmsc: string;
  bm_sv: string;
  extracted_at: string;
  valid_until: string;
  source: 'puppeteer' | 'browserless' | 'external';
};

type PuppeteerImport = PuppeteerModule | { default: PuppeteerModule };

async function loadPuppeteer(): Promise<PuppeteerModule> {
  const dynamicImport = new Function('name', 'return import(name);') as (name: string) => Promise<unknown>;
  const mod = (await dynamicImport('puppeteer')) as PuppeteerImport;
  if ('default' in mod && mod.default) return mod.default;
  return mod as PuppeteerModule;
}

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getProxyServerForLaunch(): string | null {
  if (!RAW_PROXY_URL) return null;
  try {
    const normalized = RAW_PROXY_URL.includes('://') ? RAW_PROXY_URL : `http://${RAW_PROXY_URL}`;
    const parsed = new URL(normalized);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return RAW_PROXY_URL;
  }
}

function getProxyCredentials():
  | {
      username: string;
      password: string;
    }
  | null {
  if (PROXY_USERNAME && PROXY_PASSWORD) {
    return {
      username: PROXY_USERNAME,
      password: PROXY_PASSWORD,
    };
  }

  if (!RAW_PROXY_URL) return null;
  try {
    const normalized = RAW_PROXY_URL.includes('://') ? RAW_PROXY_URL : `http://${RAW_PROXY_URL}`;
    const parsed = new URL(normalized);
    if (!parsed.username) return null;
    return {
      username: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
    };
  } catch {
    return null;
  }
}

function getLaunchArgs(): string[] {
  const args = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    // Stealth: esconde flags de automacao que o Akamai detecta
    '--disable-blink-features=AutomationControlled',
    '--disable-infobars',
    '--window-size=1920,1080',
    '--disable-extensions',
    '--lang=pt-BR',
  ];
  if (process.env.PUPPETEER_DISABLE_DEV_SHM === 'true') {
    args.push('--disable-dev-shm-usage');
  }
  const proxyServer = getProxyServerForLaunch();
  if (proxyServer) {
    args.push(`--proxy-server=${proxyServer}`);
  }
  if (IGNORE_HTTPS_ERRORS) {
    args.push('--ignore-certificate-errors');
  }
  return args;
}

// Injeta script antes de qualquer JS da pagina para esconder marcadores de automacao
const STEALTH_SCRIPT = `
  Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
  Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
  window.chrome = { runtime: {} };
`;

async function launchBrowser(timeoutMs: number): Promise<Browser> {
  const puppeteer = await loadPuppeteer();
  return puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: getLaunchArgs(),
    timeout: timeoutMs,
    protocolTimeout: timeoutMs,
    ignoreHTTPSErrors: IGNORE_HTTPS_ERRORS,
  });
}

async function applyProxyAuth(page: Page): Promise<void> {
  const credentials = getProxyCredentials();
  if (!credentials) return;
  await page.authenticate(credentials);
}

function buildEaMatchesUrl(clubId: string, maxResultCount = DEFAULT_MAX_RESULT_COUNT, matchType = DEFAULT_MATCH_TYPE): string {
  const target = new URL(DEFAULT_TARGET_URL);
  target.searchParams.set('platform', DEFAULT_PLATFORM);
  target.searchParams.set('clubIds', clubId);
  target.searchParams.set('maxResultCount', String(maxResultCount));
  target.searchParams.set('matchType', matchType);
  return target.toString();
}

async function gotoEa(page: Page, userAgent: string, timeoutMs: number): Promise<void> {
  // Injeta script de stealth antes de qualquer JS da pagina
  await page.evaluateOnNewDocument(STEALTH_SCRIPT);
  await applyProxyAuth(page);

  await page.setUserAgent(userAgent);
  await page.setExtraHTTPHeaders({
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Accept-Encoding': 'gzip, deflate, br',
    'Upgrade-Insecure-Requests': '1',
  });
  page.setDefaultNavigationTimeout(timeoutMs);
  page.setDefaultTimeout(timeoutMs);

  // Estrategia: visitar homepage HTML primeiro (para ak_bmsc),
  // aguardar JavaScript do Akamai executar (para bm_sv),
  // depois ir para a API.
  const sequence: Array<{ url: string; waitUntil: 'networkidle0' | 'networkidle2' }> = [
    { url: DEFAULT_BOOTSTRAP_URL, waitUntil: 'networkidle0' },
    { url: DEFAULT_TARGET_URL, waitUntil: 'networkidle2' },
    { url: DEFAULT_BOOTSTRAP_URL, waitUntil: 'networkidle0' },
    { url: DEFAULT_TARGET_URL, waitUntil: 'networkidle2' },
  ];

  // Visitar o bootstrap URL multiplas vezes nao agrega valor quando e o mesmo
  const dedupedSequence =
    DEFAULT_TARGET_URL === DEFAULT_BOOTSTRAP_URL
      ? [sequence[0], sequence[0]]
      : sequence;

  for (const step of dedupedSequence) {
    await page.goto(step.url, {
      waitUntil: step.waitUntil,
      timeout: timeoutMs,
    });
    await page.waitForSelector('body', { timeout: Math.min(timeoutMs, 10_000) });
    // Aguarda 3s para Akamai avaliar o sensor data e setar bm_sv
    await sleep(3_000);
  }
}

function pickAkamaiCookies(cookies: Cookie[]): Partial<Record<AkamaiCookieName, string>> {
  const result: Partial<Record<AkamaiCookieName, string>> = {};
  for (const cookie of cookies) {
    if (
      AKAMAI_COOKIE_NAMES.includes(cookie.name as AkamaiCookieName) &&
      typeof cookie.value === 'string' &&
      cookie.value.trim().length > 0
    ) {
      result[cookie.name as AkamaiCookieName] = cookie.value;
    }
  }
  return result;
}

function pickAkamaiFromSetCookie(rawHeader: string): Partial<Record<AkamaiCookieName, string>> {
  const parsed: Partial<Record<AkamaiCookieName, string>> = {};
  for (const name of AKAMAI_COOKIE_NAMES) {
    const match = rawHeader.match(new RegExp(`${name}=([^;\\r\\n]+)`, 'i'));
    const value = match?.[1]?.trim();
    if (value) {
      parsed[name] = value;
    }
  }
  return parsed;
}

function mergeAkamai(
  base: Partial<Record<AkamaiCookieName, string>>,
  incoming: Partial<Record<AkamaiCookieName, string>>,
): Partial<Record<AkamaiCookieName, string>> {
  return {
    ak_bmsc: incoming.ak_bmsc ?? base.ak_bmsc,
    bm_sv: incoming.bm_sv ?? base.bm_sv,
  };
}

async function waitForAkamaiCookies(
  page: Page,
  timeoutMs: number,
  observedFromHeaders: Partial<Record<AkamaiCookieName, string>>,
): Promise<Record<AkamaiCookieName, string>> {
  const startedAt = Date.now();
  let lastRefreshAt = 0;

  while (Date.now() - startedAt < timeoutMs) {
    const pageCookies = await page.cookies();
    const candidate = mergeAkamai(observedFromHeaders, pickAkamaiCookies(pageCookies));
    if (candidate.ak_bmsc && candidate.bm_sv) {
      return { ak_bmsc: candidate.ak_bmsc, bm_sv: candidate.bm_sv };
    }

    if (Date.now() - lastRefreshAt >= 4_000) {
      try {
        await page.goto(DEFAULT_TARGET_URL, {
          waitUntil: 'networkidle2',
          timeout: Math.min(timeoutMs, 15_000),
        });
        await page.waitForSelector('body', { timeout: Math.min(timeoutMs, 8_000) });
      } catch {
        // Continue polling even if a refresh fails.
      }
      lastRefreshAt = Date.now();
    }

    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`Timeout: cookies ${AKAMAI_COOKIE_NAMES.join(', ')} nao encontrados`);
}

async function setCookiesOnPage(page: Page, cookies: Record<AkamaiCookieName, string>): Promise<void> {
  await page.setCookie(
    { name: 'ak_bmsc', value: cookies.ak_bmsc, url: DEFAULT_BOOTSTRAP_URL },
    { name: 'bm_sv', value: cookies.bm_sv, url: DEFAULT_BOOTSTRAP_URL },
  );
}

function toBundle(cookies: Record<AkamaiCookieName, string>): AkamaiCookieBundle {
  const extractedAtDate = new Date();
  const validUntilDate = new Date(extractedAtDate.getTime() + DEFAULT_COOKIE_TTL_MINUTES * 60_000);
  return {
    ak_bmsc: cookies.ak_bmsc,
    bm_sv: cookies.bm_sv,
    extracted_at: extractedAtDate.toISOString(),
    valid_until: validUntilDate.toISOString(),
    source: 'puppeteer',
  };
}

type BrowserFetchOptions = {
  maxResultCount?: number;
  matchType?: string;
};

export async function fetchEaMatchesViaBrowser(
  clubId: string,
  options: BrowserFetchOptions = {},
): Promise<unknown> {
  let lastError: Error | null = null;
  const maxResultCount = options.maxResultCount ?? DEFAULT_MAX_RESULT_COUNT;
  const matchType = options.matchType ?? DEFAULT_MATCH_TYPE;
  const apiUrl = buildEaMatchesUrl(clubId, maxResultCount, matchType);

  for (let attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt += 1) {
    let browser: Browser | null = null;
    const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];

    try {
      browser = await launchBrowser(DEFAULT_TIMEOUT_MS);
      const page = await browser.newPage();
      await gotoEa(page, userAgent, DEFAULT_TIMEOUT_MS);

      type BrowserFetchResult = {
        status: number;
        statusText: string;
        bodyText: string;
      };

      const result = await page.evaluate<BrowserFetchResult>(async (url) => {
        const response = await fetch(url as string, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          },
          credentials: 'include',
        });

        const bodyText = await response.text();
        return {
          status: response.status,
          statusText: response.statusText,
          bodyText,
        };
      }, apiUrl);

      if (result.status < 200 || result.status >= 300) {
        const bodyHead = result.bodyText.slice(0, 180).replace(/\s+/g, ' ');
        throw new Error(`EA API respondeu ${result.status} ${result.statusText}: ${bodyHead}`);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(result.bodyText);
      } catch (error) {
        const parseMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`EA API retornou JSON invalido: ${parseMessage}`);
      }

      logger.info('puppeteer_matches_attempt_success', {
        event: 'puppeteer_matches_attempt_success',
        attempt,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
        club_id: clubId,
      });
      return parsed;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('puppeteer_matches_attempt_failure', {
        event: 'puppeteer_matches_attempt_failure',
        attempt,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
        club_id: clubId,
        ...errorContext(lastError),
      });
    } finally {
      if (browser) {
        await browser.close().catch(() => {
          logger.error('puppeteer_close_failure', {
            event: 'puppeteer_close_failure',
          });
        });
      }
    }
  }

  throw new Error(`[cookie-service] Nao foi possivel buscar matches via browser: ${lastError?.message ?? 'erro desconhecido'}`);
}

export async function renewCookieBundle(): Promise<AkamaiCookieBundle> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= DEFAULT_MAX_ATTEMPTS; attempt++) {
    let browser: Browser | null = null;
    const userAgent = USER_AGENTS[(attempt - 1) % USER_AGENTS.length];
    try {
      browser = await launchBrowser(DEFAULT_TIMEOUT_MS);
      const page = await browser.newPage();
      const observedFromHeaders: Partial<Record<AkamaiCookieName, string>> = {};
      page.on('response', (response: HttpResponse) => {
        try {
          const setCookie = response.headers()['set-cookie'];
          if (!setCookie) return;
          const extracted = pickAkamaiFromSetCookie(setCookie);
          const merged = mergeAkamai(observedFromHeaders, extracted);
          observedFromHeaders.ak_bmsc = merged.ak_bmsc;
          observedFromHeaders.bm_sv = merged.bm_sv;
        } catch {
          // Ignore response parsing errors; page.cookies() remains the primary source.
        }
      });

      await gotoEa(page, userAgent, DEFAULT_TIMEOUT_MS);
      const cookies = await waitForAkamaiCookies(page, DEFAULT_TIMEOUT_MS, observedFromHeaders);
      await setCookiesOnPage(page, cookies);
      const bundle = toBundle(cookies);
      logger.info('puppeteer_attempt_success', {
        event: 'puppeteer_attempt_success',
        attempt,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
      });
      return bundle;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      logger.warn('puppeteer_attempt_failure', {
        event: 'puppeteer_attempt_failure',
        attempt,
        max_attempts: DEFAULT_MAX_ATTEMPTS,
        ...errorContext(lastError),
      });
    } finally {
      if (browser) {
        await browser.close().catch(() => {
          logger.error('puppeteer_close_failure', {
            event: 'puppeteer_close_failure',
          });
        });
      }
    }
  }

  throw new Error(`[cookie-service] Nao foi possivel renovar cookies Akamai: ${lastError?.message ?? 'erro desconhecido'}`);
}

