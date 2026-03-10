import { renewCookieBundle, type AkamaiCookieBundle } from './puppeteer';
import { fetchEaMatchesWithCookieBundle, getEaHealthcheckClubId, type EaFetchResolvedBy, type EaFetchStage } from './ea-fetch';
import { getCookieStorageConfig, isCookieBundleValid, loadCookies, saveCookies } from './storage';
import { fetchBrowserlessCookieBundle, isBrowserlessConfigured } from './browserless';
import { cookieMetadata, errorContext, logger, loggerConfig } from './logger';

type CronTask = {
  start: () => void;
  stop: () => void;
};

type NodeCronModule = {
  schedule: (
    expression: string,
    task: () => void,
    options?: { timezone?: string },
  ) => CronTask;
  validate: (expression: string) => boolean;
};

type Request = {
  headers: Record<string, string | string[] | undefined>;
  path: string;
  body: unknown;
  method?: string;
};

type Response = {
  status: (code: number) => Response;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string) => void;
  end: () => void;
};

type Next = () => void;

type ExpressApp = {
  use: (...handlers: unknown[]) => void;
  get: (path: string, handler: (req: Request, res: Response) => void | Promise<void>) => void;
  post: (path: string, handler: (req: Request, res: Response) => void | Promise<void>) => void;
  listen: (port: number, cb: () => void) => void;
};

type ExpressFactory = (() => ExpressApp) & {
  json: () => unknown;
};

type RenewalTrigger = 'startup' | 'cron' | 'manual' | 'api';

type RenewalState = {
  isRunning: boolean;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  lastDurationMs: number | null;
  nextExecutionAt: string | null;
  totalRuns: number;
  successRuns: number;
  failedRuns: number;
  skippedRuns: number;
  lastTrigger: RenewalTrigger | null;
};

type NodeCronImport = NodeCronModule | { default: NodeCronModule };

type CookieResolution = {
  bundle: AkamaiCookieBundle;
  resolvedBy: EaFetchResolvedBy;
};

type EaFetchExecutionResult = {
  ok: boolean;
  stage: EaFetchStage;
  resolvedBy: EaFetchResolvedBy | null;
  usedCachedCookie: boolean;
  cacheHasCookie: boolean;
  upstreamStatus: number | null;
  contentType: string | null;
  bodySnippet: string | null;
  error: string | null;
  matches?: unknown;
};

function toPositiveInt(raw: string | undefined, fallback: number, allowZero = false): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value)) return fallback;
  if (allowZero ? value < 0 : value <= 0) return fallback;
  return value;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeInterval(minutes: number): number {
  if (minutes === 0) return 0;
  if (minutes < 15) return 15;
  if (minutes > 1440) return 1440;
  return minutes;
}

async function importModule<T>(name: string): Promise<T> {
  const dynamicImport = new Function('name', 'return import(name);') as (moduleName: string) => Promise<unknown>;
  return (await dynamicImport(name)) as T;
}

const PORT = toPositiveInt(process.env.PORT, 3001);
const SECRET = process.env.COOKIE_SERVICE_SECRET ?? '';
const TIMEZONE = process.env.TIMEZONE ?? process.env.TZ ?? 'America/Sao_Paulo';
const INTERVAL_MINUTES = normalizeInterval(toPositiveInt(process.env.COOKIE_RENEW_INTERVAL_MINUTES, 15, true));
const RAW_CRON_EXPRESSION = (process.env.COOKIE_RENEW_CRON ?? '').trim();
const CRON_DISABLED = INTERVAL_MINUTES === 0 && RAW_CRON_EXPRESSION.length === 0;
const CRON_EXPRESSION = RAW_CRON_EXPRESSION.length > 0 ? RAW_CRON_EXPRESSION
  : CRON_DISABLED ? '0 0 29 2 *'
  : `*/${INTERVAL_MINUTES} * * * *`;
const STORAGE_CONFIG = getCookieStorageConfig();

const renewalState: RenewalState = {
  isRunning: false,
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
  lastDurationMs: null,
  nextExecutionAt: null,
  totalRuns: 0,
  successRuns: 0,
  failedRuns: 0,
  skippedRuns: 0,
  lastTrigger: null,
};

let latestBundle: AkamaiCookieBundle | null = null;

function computeNextExecution(from = new Date()): string {
  if (CRON_DISABLED) return 'disabled';
  const ms = from.getTime();
  const intervalMs = INTERVAL_MINUTES * 60_000;
  const nextMs = Math.ceil((ms + 1) / intervalMs) * intervalMs;
  return new Date(nextMs).toISOString();
}

function getSecretFromHeader(req: Request): string {
  const raw = req.headers['x-secret'];
  if (!raw) return '';
  return Array.isArray(raw) ? raw[0] ?? '' : raw;
}

function isAuthorized(req: Request): boolean {
  if (!SECRET) return true;
  return getSecretFromHeader(req) === SECRET;
}

function getCachePayload(bundle: AkamaiCookieBundle | null) {
  return bundle
    ? {
        hasCookie: true,
        extractedAt: bundle.extracted_at,
        validUntil: bundle.valid_until,
        source: bundle.source,
      }
    : {
        hasCookie: false,
      };
}

function rememberBundle(bundle: AkamaiCookieBundle): void {
  latestBundle = bundle;
  renewalState.lastSuccessAt = bundle.extracted_at;
  renewalState.lastError = null;
}

async function persistResolvedBundle(bundle: AkamaiCookieBundle): Promise<void> {
  await saveCookies(bundle);
  rememberBundle(bundle);
}

async function loadValidBundleFromCacheOrStorage(): Promise<AkamaiCookieBundle | null> {
  if (latestBundle && isCookieBundleValid(latestBundle)) {
    return latestBundle;
  }

  const stored = await loadCookies();
  if (!stored) return null;

  rememberBundle(stored);
  return stored;
}

async function runRenewal(trigger: RenewalTrigger): Promise<AkamaiCookieBundle | null> {
  if (renewalState.isRunning) {
    renewalState.skippedRuns += 1;
    renewalState.lastTrigger = trigger;
    logger.warn('renewal_skipped', {
      event: 'renewal_skipped',
      trigger,
      reason: 'already_running',
    });
    return null;
  }

  renewalState.isRunning = true;
  renewalState.lastTrigger = trigger;
  renewalState.lastAttemptAt = new Date().toISOString();

  const startedAt = Date.now();
  logger.info('renewal_start', {
    event: 'renewal_start',
    trigger,
    storage_driver: STORAGE_CONFIG.driver,
  });

  try {
    const bundle = await renewCookieBundle();
    await saveCookies(bundle);
    const durationMs = Date.now() - startedAt;

    rememberBundle(bundle);
    renewalState.successRuns += 1;

    logger.info('renewal_success', {
      event: 'renewal_success',
      trigger,
      duration_ms: durationMs,
      storage_driver: STORAGE_CONFIG.driver,
      cookie: cookieMetadata(bundle),
    });
    return bundle;
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    renewalState.lastError = err.message;
    renewalState.failedRuns += 1;
    logger.error('renewal_failure', {
      event: 'renewal_failure',
      trigger,
      ...errorContext(err),
    });
    throw err;
  } finally {
    renewalState.isRunning = false;
    renewalState.totalRuns += 1;
    renewalState.lastDurationMs = Date.now() - startedAt;
    renewalState.nextExecutionAt = computeNextExecution();
  }
}

async function hydrateCacheFromStorage(): Promise<void> {
  try {
    const bundle = await loadValidBundleFromCacheOrStorage();
    if (!bundle) {
      logger.info('startup_no_valid_cookie', {
        event: 'startup_no_valid_cookie',
        storage_driver: STORAGE_CONFIG.driver,
      });
      return;
    }

    logger.info('startup_cookie_restored', {
      event: 'startup_cookie_restored',
      storage_driver: STORAGE_CONFIG.driver,
      cookie: cookieMetadata(bundle),
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    renewalState.lastError = `storage_load_failed: ${err.message}`;
    logger.error('startup_storage_load_failed', {
      event: 'startup_storage_load_failed',
      ...errorContext(err),
    });
  }
}

async function getCookiesWithFallback(): Promise<CookieResolution> {
  const cachedOrStored = await loadValidBundleFromCacheOrStorage();
  if (cachedOrStored) {
    return { bundle: cachedOrStored, resolvedBy: 'cache' };
  }

  try {
    const renewed = await runRenewal('api');
    if (renewed) {
      return { bundle: renewed, resolvedBy: 'puppeteer' };
    }

    await sleep(1500);
    const afterWait = await loadValidBundleFromCacheOrStorage();
    if (afterWait) {
      return { bundle: afterWait, resolvedBy: 'cache' };
    }
  } catch (renewError) {
    logger.warn('api_cookie_puppeteer_failed', {
      event: 'api_cookie_puppeteer_failed',
      ...errorContext(renewError),
    });
  }

  if (!isBrowserlessConfigured()) {
    throw new Error('cookie_unavailable');
  }

  const fallbackBundle = await fetchBrowserlessCookieBundle();
  await persistResolvedBundle(fallbackBundle);

  logger.info('fallback_browserless_success', {
    event: 'fallback_browserless_success',
    cookie: cookieMetadata(fallbackBundle),
  });

  return { bundle: fallbackBundle, resolvedBy: 'browserless' };
}

function buildEaFetchFailure(
  stage: EaFetchStage,
  resolvedBy: EaFetchResolvedBy | null,
  usedCachedCookie: boolean,
  cacheHasCookie: boolean,
  error: string,
  upstreamStatus: number | null,
  contentType: string | null,
  bodySnippet: string | null,
): EaFetchExecutionResult {
  return {
    ok: false,
    stage,
    resolvedBy,
    usedCachedCookie,
    cacheHasCookie,
    upstreamStatus,
    contentType,
    bodySnippet,
    error,
  };
}

async function attemptFetchWithBundle(
  clubId: string,
  bundle: AkamaiCookieBundle | null,
  stage: EaFetchStage,
  resolvedBy: EaFetchResolvedBy | null,
  usedCachedCookie: boolean,
  cacheHasCookie: boolean,
  options: { maxResultCount?: number; matchType?: string },
): Promise<EaFetchExecutionResult> {
  const result = await fetchEaMatchesWithCookieBundle(clubId, bundle, options);

  if (result.ok) {
    return {
      ok: true,
      stage,
      resolvedBy,
      usedCachedCookie,
      cacheHasCookie,
      upstreamStatus: result.upstreamStatus,
      contentType: result.contentType,
      bodySnippet: null,
      error: null,
      matches: result.matches,
    };
  }

  return buildEaFetchFailure(
    stage,
    resolvedBy,
    usedCachedCookie,
    cacheHasCookie,
    result.message,
    result.upstreamStatus,
    result.contentType,
    result.bodySnippet,
  );
}

async function executeEaFetch(
  clubId: string,
  options: { maxResultCount?: number; matchType?: string },
): Promise<EaFetchExecutionResult> {
  const initialBundle = await loadValidBundleFromCacheOrStorage();
  const cacheHasCookie = Boolean(initialBundle);
  let lastFailure = buildEaFetchFailure(
    'cached_cookie',
    null,
    false,
    cacheHasCookie,
    'Nenhum bundle valido disponivel para fetch EA.',
    null,
    null,
    null,
  );

  if (initialBundle) {
    const cachedAttempt = await attemptFetchWithBundle(
      clubId,
      initialBundle,
      'cached_cookie',
      'cache',
      true,
      true,
      options,
    );
    if (cachedAttempt.ok) return cachedAttempt;
    lastFailure = cachedAttempt;
  }

  try {
    const renewed = await runRenewal('api');
    const renewalBundle = renewed ?? (await loadValidBundleFromCacheOrStorage());

    if (renewalBundle) {
      const renewedAttempt = await attemptFetchWithBundle(
        clubId,
        renewalBundle,
        'puppeteer_renewal',
        renewed ? 'puppeteer' : 'cache',
        false,
        cacheHasCookie,
        options,
      );
      if (renewedAttempt.ok) return renewedAttempt;
      lastFailure = renewedAttempt;
    }
  } catch (renewError) {
    logger.warn('api_ea_matches_puppeteer_failed', {
      event: 'api_ea_matches_puppeteer_failed',
      club_id: clubId,
      ...errorContext(renewError),
    });
  }

  if (!isBrowserlessConfigured()) {
    return lastFailure;
  }

  try {
    const fallbackBundle = await fetchBrowserlessCookieBundle();
    await persistResolvedBundle(fallbackBundle);

    logger.info('fallback_browserless_success', {
      event: 'fallback_browserless_success',
      cookie: cookieMetadata(fallbackBundle),
    });

    const browserlessAttempt = await attemptFetchWithBundle(
      clubId,
      fallbackBundle,
      'browserless_renewal',
      'browserless',
      false,
      cacheHasCookie,
      options,
    );
    if (browserlessAttempt.ok) return browserlessAttempt;
    return browserlessAttempt;
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    logger.warn('api_ea_matches_browserless_failed', {
      event: 'api_ea_matches_browserless_failed',
      club_id: clubId,
      ...errorContext(error),
    });
    return buildEaFetchFailure(
      'browserless_renewal',
      'browserless',
      false,
      cacheHasCookie,
      err,
      null,
      null,
      null,
    );
  }
}

async function bootstrap(): Promise<void> {
  const expressModule = await importModule<{ default: ExpressFactory }>('express');
  const cronImport = await importModule<NodeCronImport>('node-cron');
  const cron = 'default' in cronImport ? cronImport.default : cronImport;
  const express = expressModule.default;

  if (!cron.validate(CRON_EXPRESSION)) {
    throw new Error(`[cookie-service] Expressao cron invalida: ${CRON_EXPRESSION}`);
  }

  const app = express();
  app.use(express.json());

  app.use((req: Request, res: Response, next: Next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-secret');
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  app.use((req: Request, res: Response, next: Next) => {
    if (req.path === '/health') {
      next();
      return;
    }

    if (!isAuthorized(req)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }

    next();
  });

  app.get('/health', async (_req: Request, res: Response) => {
    const bundle = await loadValidBundleFromCacheOrStorage().catch(() => latestBundle);

    res.json({
      status: renewalState.lastError ? 'degraded' : 'ok',
      last_execution: renewalState.lastSuccessAt,
      next_execution: renewalState.nextExecutionAt,
      scheduler: {
        cronExpression: CRON_EXPRESSION,
        intervalMinutes: INTERVAL_MINUTES,
        timezone: TIMEZONE,
      },
      storage: {
        driver: STORAGE_CONFIG.driver,
        maxAgeMinutes: STORAGE_CONFIG.maxAgeMinutes,
        filePath: STORAGE_CONFIG.driver === 'file' ? STORAGE_CONFIG.filePath : undefined,
      },
      fallback: {
        browserlessConfigured: isBrowserlessConfigured(),
        hasCustomFallbackUrl: Boolean(process.env.BROWSERLESS_FALLBACK_URL),
        hasBrowserlessToken: Boolean(process.env.BROWSERLESS_TOKEN),
      },
      logging: loggerConfig(),
      renewal: renewalState,
      cache: getCachePayload(bundle),
    });
  });

  app.get('/health/ea-fetch', async (_req: Request, res: Response) => {
    const healthcheckClubId = getEaHealthcheckClubId();
    const result = await executeEaFetch(healthcheckClubId, {
      maxResultCount: 1,
      matchType: 'friendlyMatch',
    });

    res.status(result.ok ? 200 : 502).json({
      ok: result.ok,
      club_id: healthcheckClubId,
      stage: result.stage,
      resolvedBy: result.resolvedBy,
      usedCachedCookie: result.usedCachedCookie,
      cache: {
        hasCookie: result.cacheHasCookie,
      },
      upstreamStatus: result.upstreamStatus,
      contentType: result.contentType,
      bodySnippet: result.bodySnippet,
      lastError: result.error,
    });
  });

  async function handleGetCookies(_req: Request, res: Response): Promise<void> {
    try {
      const { bundle, resolvedBy } = await getCookiesWithFallback();
      logger.info('api_cookies_success', {
        event: 'api_cookies_success',
        resolved_by: resolvedBy,
        cookie: cookieMetadata(bundle),
      });

      res.json({
        ak_bmsc: bundle.ak_bmsc,
        bm_sv: bundle.bm_sv,
        source: bundle.source,
        extracted_at: bundle.extracted_at,
        valid_until: bundle.valid_until,
        resolved_by: resolvedBy,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      logger.error('api_cookies_failure', {
        event: 'api_cookies_failure',
        ...errorContext(error),
      });
      res.status(503).json({
        error: 'cookie_unavailable',
        message,
      });
    }
  }

  app.get('/api/cookies', handleGetCookies);
  app.get('/cookie', handleGetCookies);

  app.post('/api/cookies', async (req: Request, res: Response) => {
    try {
      const body = req.body as { ak_bmsc?: unknown; bm_sv?: unknown; ttl_minutes?: unknown };
      const ak_bmsc = typeof body.ak_bmsc === 'string' ? body.ak_bmsc.trim() : '';
      const bm_sv = typeof body.bm_sv === 'string' ? body.bm_sv.trim() : '';

      if (!ak_bmsc || !bm_sv) {
        res.status(400).json({ error: 'ak_bmsc e bm_sv sao obrigatorios' });
        return;
      }

      const ttl = typeof body.ttl_minutes === 'number' && body.ttl_minutes > 0
        ? body.ttl_minutes
        : STORAGE_CONFIG.maxAgeMinutes;

      const extractedAt = new Date();
      const validUntil = new Date(extractedAt.getTime() + ttl * 60_000);
      const bundle: AkamaiCookieBundle = {
        ak_bmsc,
        bm_sv,
        extracted_at: extractedAt.toISOString(),
        valid_until: validUntil.toISOString(),
        source: 'external',
      };

      await persistResolvedBundle(bundle);

      logger.info('cookies_injected', {
        event: 'cookies_injected',
        ttl_minutes: ttl,
        valid_until: bundle.valid_until,
      });

      res.json({ status: 'ok', extracted_at: bundle.extracted_at, valid_until: bundle.valid_until });
    } catch (error) {
      logger.error('cookie_injection_failed', { event: 'cookie_injection_failed', ...errorContext(error) });
      res.status(500).json({ error: 'injection_failed', message: error instanceof Error ? error.message : 'unknown' });
    }
  });

  app.post('/renew', async (_req: Request, res: Response) => {
    try {
      const bundle = await runRenewal('manual');

      if (!bundle) {
        res.status(409).json({
          error: 'renewal_in_progress',
          message: 'Uma renovacao ja esta em andamento.',
        });
        return;
      }

      res.json({
        status: 'ok',
        trigger: 'manual',
        extractedAt: bundle.extracted_at,
        validUntil: bundle.valid_until,
        source: bundle.source,
      });
    } catch (error) {
      const err = error instanceof Error ? error.message : 'unknown_error';
      logger.error('manual_renewal_failed', {
        event: 'manual_renewal_failed',
        ...errorContext(error),
      });
      res.status(500).json({
        error: 'renewal_failed',
        message: err,
      });
    }
  });

  app.post('/api/ea/matches', async (req: Request, res: Response) => {
    try {
      const body = req.body as { clubId?: unknown; maxResultCount?: unknown; matchType?: unknown };
      const clubId = typeof body.clubId === 'string' ? body.clubId.trim() : '';

      if (!clubId) {
        res.status(400).json({ error: 'clubId is required' });
        return;
      }

      const maxResultCount =
        typeof body.maxResultCount === 'number' && Number.isFinite(body.maxResultCount) && body.maxResultCount > 0
          ? Math.floor(body.maxResultCount)
          : undefined;

      const matchType =
        typeof body.matchType === 'string' && body.matchType.trim().length > 0 ? body.matchType.trim() : undefined;

      logger.info('api_ea_matches_start', {
        event: 'api_ea_matches_start',
        club_id: clubId,
        max_result_count: maxResultCount ?? null,
        match_type: matchType ?? null,
      });

      const result = await executeEaFetch(clubId, {
        maxResultCount,
        matchType,
      });

      if (!result.ok) {
        logger.error('api_ea_matches_failure', {
          event: 'api_ea_matches_failure',
          club_id: clubId,
          stage: result.stage,
          resolved_by: result.resolvedBy,
          used_cached_cookie: result.usedCachedCookie,
          upstream_status: result.upstreamStatus,
          content_type: result.contentType,
          body_snippet: result.bodySnippet,
          error: result.error,
        });
        res.status(502).json({
          error: 'ea_fetch_failed',
          message: result.error,
          stage: result.stage,
          resolvedBy: result.resolvedBy,
          usedCachedCookie: result.usedCachedCookie,
          upstreamStatus: result.upstreamStatus,
          contentType: result.contentType,
          bodySnippet: result.bodySnippet,
          cache: {
            hasCookie: result.cacheHasCookie,
          },
        });
        return;
      }

      logger.info('api_ea_matches_success', {
        event: 'api_ea_matches_success',
        club_id: clubId,
        stage: result.stage,
        resolved_by: result.resolvedBy,
      });

      res.json({
        club_id: clubId,
        matches: result.matches,
        stage: result.stage,
        resolvedBy: result.resolvedBy,
        usedCachedCookie: result.usedCachedCookie,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown_error';
      logger.error('api_ea_matches_failure', {
        event: 'api_ea_matches_failure',
        ...errorContext(error),
      });
      res.status(502).json({
        error: 'ea_fetch_failed',
        message,
        stage: 'cached_cookie',
        resolvedBy: null,
        usedCachedCookie: false,
        upstreamStatus: null,
        contentType: null,
        bodySnippet: null,
        cache: {
          hasCookie: Boolean(latestBundle && isCookieBundleValid(latestBundle)),
        },
      });
    }
  });

  const cronTask = cron.schedule(
    CRON_EXPRESSION,
    () => {
      void runRenewal('cron').catch(() => undefined);
    },
    { timezone: TIMEZONE },
  );

  cronTask.start();
  renewalState.nextExecutionAt = computeNextExecution();

  void (async () => {
    await hydrateCacheFromStorage();
    if (!CRON_DISABLED && (!latestBundle || !isCookieBundleValid(latestBundle))) {
      void runRenewal('startup').catch(() => undefined);
    }
  })();

  app.listen(PORT, () => {
    logger.info('service_started', {
      event: 'service_started',
      port: PORT,
      scheduler_cron: CRON_EXPRESSION,
      timezone: TIMEZONE,
      storage_driver: STORAGE_CONFIG.driver,
      logging: loggerConfig(),
    });
  });
}

void bootstrap().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error('bootstrap_fatal', {
    event: 'bootstrap_fatal',
    message,
    ...errorContext(error),
  });
  process.exit(1);
});
