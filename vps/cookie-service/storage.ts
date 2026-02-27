import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { AkamaiCookieBundle } from './puppeteer';

type CookieStorageDriver = 'file' | 'supabase';

type SupabaseCookieRow = {
  ak_bmsc?: string;
  bm_sv?: string;
  extracted_at?: string;
  expires_at?: string;
  valid_until?: string;
  source?: string;
};

const STORAGE_DRIVER = getStorageDriver(process.env.COOKIE_STORAGE_DRIVER);
const STORAGE_FILE_PATH =
  process.env.COOKIE_STORAGE_FILE_PATH ??
  path.resolve(process.cwd(), 'runtime', 'akamai-cookies.json');
const COOKIE_MAX_AGE_MINUTES = toPositiveInt(process.env.AKAMAI_COOKIE_MAX_AGE_MINUTES, 30);

const SUPABASE_URL = process.env.SUPABASE_URL ?? '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const SUPABASE_COOKIES_TABLE = process.env.AKAMAI_COOKIES_TABLE ?? 'akamai_cookies';

// ID fixo para upsert: mantemos sempre 1 linha na tabela (last-writer-wins)
const SUPABASE_SINGLETON_ID = 1;

function toPositiveInt(raw: string | undefined, fallback: number): number {
  if (!raw) return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return fallback;
  return value;
}

function getStorageDriver(raw: string | undefined): CookieStorageDriver {
  if (raw === 'supabase') return 'supabase';
  return 'file';
}

function ensureBundleShape(bundle: Partial<AkamaiCookieBundle>): AkamaiCookieBundle | null {
  if (
    !bundle.ak_bmsc ||
    !bundle.bm_sv ||
    !bundle.extracted_at ||
    !bundle.valid_until ||
    !bundle.source
  ) {
    return null;
  }

  return {
    ak_bmsc: bundle.ak_bmsc,
    bm_sv: bundle.bm_sv,
    extracted_at: bundle.extracted_at,
    valid_until: bundle.valid_until,
    source: bundle.source,
  };
}

function normalizeRow(row: SupabaseCookieRow): AkamaiCookieBundle | null {
  return ensureBundleShape({
    ak_bmsc: row.ak_bmsc,
    bm_sv: row.bm_sv,
    extracted_at: row.extracted_at,
    valid_until: row.valid_until ?? row.expires_at,
    source: row.source === 'browserless' ? 'browserless' : 'puppeteer',
  });
}

function isValidDate(value: string): boolean {
  return Number.isFinite(new Date(value).getTime());
}

export function isCookieBundleValid(bundle: AkamaiCookieBundle, now = new Date()): boolean {
  if (!bundle.ak_bmsc.trim() || !bundle.bm_sv.trim()) return false;
  if (!isValidDate(bundle.extracted_at) || !isValidDate(bundle.valid_until)) return false;

  const extractedAt = new Date(bundle.extracted_at).getTime();
  const validUntil = new Date(bundle.valid_until).getTime();
  const maxAllowed = extractedAt + COOKIE_MAX_AGE_MINUTES * 60_000;
  const effectiveExpiration = Math.min(validUntil, maxAllowed);
  return now.getTime() < effectiveExpiration;
}

// --- File storage ---

async function readBundleFromFile(): Promise<Partial<AkamaiCookieBundle> | null> {
  try {
    const content = await fs.readFile(STORAGE_FILE_PATH, 'utf-8');
    return JSON.parse(content) as Partial<AkamaiCookieBundle>;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err?.code === 'ENOENT') return null;
    throw error;
  }
}

async function saveToFile(bundle: AkamaiCookieBundle): Promise<void> {
  await fs.mkdir(path.dirname(STORAGE_FILE_PATH), { recursive: true });
  await fs.writeFile(STORAGE_FILE_PATH, JSON.stringify(bundle, null, 2), 'utf-8');
}

async function loadFromFile(): Promise<AkamaiCookieBundle | null> {
  const parsed = await readBundleFromFile();
  if (!parsed) return null;
  const bundle = ensureBundleShape(parsed);
  if (!bundle) return null;
  return isCookieBundleValid(bundle) ? bundle : null;
}

async function loadFromFileRaw(): Promise<AkamaiCookieBundle | null> {
  const parsed = await readBundleFromFile();
  if (!parsed) return null;
  return ensureBundleShape(parsed);
}

// --- Supabase storage ---

function ensureSupabaseConfig(): void {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('[cookie-service] SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios para storage supabase.');
  }
}

function supabaseHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
  };
}

async function saveToSupabase(bundle: AkamaiCookieBundle): Promise<void> {
  ensureSupabaseConfig();
  // Upsert via PATCH com id fixo (singleton row) — evita crescimento ilimitado da tabela
  const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_COOKIES_TABLE}?id=eq.${SUPABASE_SINGLETON_ID}`;

  const payload = {
    id: SUPABASE_SINGLETON_ID,
    ak_bmsc: bundle.ak_bmsc,
    bm_sv: bundle.bm_sv,
    extracted_at: bundle.extracted_at,
    expires_at: bundle.valid_until,
    source: bundle.source,
  };

  // Tenta PATCH primeiro (atualiza row existente)
  const patchRes = await fetch(endpoint, {
    method: 'PATCH',
    headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
    body: JSON.stringify(payload),
  });

  // Se nenhuma linha foi afetada (404 ou 0 rows), faz POST para criar
  if (patchRes.status === 404 || patchRes.headers.get('content-range') === '*/0') {
    const insertEndpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_COOKIES_TABLE}`;
    const insertRes = await fetch(insertEndpoint, {
      method: 'POST',
      headers: { ...supabaseHeaders(), Prefer: 'return=minimal' },
      body: JSON.stringify(payload),
    });
    if (!insertRes.ok) {
      const body = await insertRes.text().catch(() => '');
      throw new Error(`[cookie-service] Falha ao salvar cookie no Supabase (${insertRes.status}): ${body}`);
    }
    return;
  }

  if (!patchRes.ok) {
    const body = await patchRes.text().catch(() => '');
    throw new Error(`[cookie-service] Falha ao atualizar cookie no Supabase (${patchRes.status}): ${body}`);
  }
}

async function fetchLatestSupabaseRow(): Promise<SupabaseCookieRow | null> {
  ensureSupabaseConfig();
  const endpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_COOKIES_TABLE}?select=ak_bmsc,bm_sv,extracted_at,expires_at,valid_until,source&order=extracted_at.desc&limit=1`;

  const response = await fetch(endpoint, { headers: supabaseHeaders() });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`[cookie-service] Falha ao carregar cookie do Supabase (${response.status}): ${body}`);
  }

  const rows = (await response.json()) as SupabaseCookieRow[];
  return rows?.[0] ?? null;
}

async function loadFromSupabase(): Promise<AkamaiCookieBundle | null> {
  const row = await fetchLatestSupabaseRow();
  if (!row) return null;
  const bundle = normalizeRow(row);
  if (!bundle) return null;
  return isCookieBundleValid(bundle) ? bundle : null;
}

async function loadFromSupabaseRaw(): Promise<AkamaiCookieBundle | null> {
  const row = await fetchLatestSupabaseRow();
  if (!row) return null;
  return normalizeRow(row);
}

// --- Public API ---

export async function saveCookies(bundle: AkamaiCookieBundle): Promise<void> {
  if (STORAGE_DRIVER === 'supabase') {
    await saveToSupabase(bundle);
    return;
  }

  await saveToFile(bundle);
}

export async function loadCookies(): Promise<AkamaiCookieBundle | null> {
  if (STORAGE_DRIVER === 'supabase') {
    return loadFromSupabase();
  }

  return loadFromFile();
}

export async function loadLatestCookiesRaw(): Promise<AkamaiCookieBundle | null> {
  if (STORAGE_DRIVER === 'supabase') {
    return loadFromSupabaseRaw();
  }

  return loadFromFileRaw();
}

export function getCookieStorageConfig(): { driver: CookieStorageDriver; maxAgeMinutes: number; filePath: string } {
  return {
    driver: STORAGE_DRIVER,
    maxAgeMinutes: COOKIE_MAX_AGE_MINUTES,
    filePath: STORAGE_FILE_PATH,
  };
}
