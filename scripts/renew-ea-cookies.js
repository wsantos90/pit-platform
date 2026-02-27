#!/usr/bin/env node
// @ts-check
/**
 * Renova cookies Akamai (ak_bmsc + bm_sv) via Playwright e injeta no cookie service.
 *
 * Executado pelo GitHub Actions cron: .github/workflows/renew-ea-cookies.yml
 * Requer: COOKIE_SERVICE_URL, COOKIE_SERVICE_SECRET, EA_COOKIE_TARGET_URL
 *
 * Estrategia:
 *   1. Visitar homepage (bootstrap URL) — Akamai define ak_bmsc
 *   2. Aguardar 3s para sensor data ser avaliado
 *   3. Navegar para URL da API — Akamai avalia fingerprint, define bm_sv
 *   4. Polling ate bm_sv aparecer (max 30s)
 *   5. POST /api/cookies no cookie service
 */

'use strict';

const { chromium } = require('playwright');

const COOKIE_SERVICE_URL = (process.env.COOKIE_SERVICE_URL ?? '').replace(/\/$/, '');
const COOKIE_SERVICE_SECRET = process.env.COOKIE_SERVICE_SECRET ?? '';
const TARGET_URL =
  process.env.EA_COOKIE_TARGET_URL ??
  'https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=1499996&maxResultCount=20&matchType=friendlyMatch';
const BOOTSTRAP_URL = process.env.EA_COOKIE_BOOTSTRAP_URL ?? 'https://proclubs.ea.com';

const TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_MS = 30_000;

if (!COOKIE_SERVICE_URL) {
  console.error('❌ COOKIE_SERVICE_URL nao definido');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {import('playwright').Page} page
 * @returns {Promise<{ak_bmsc: string, bm_sv: string}>}
 */
async function waitForCookies(page) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_POLL_MS) {
    const cookies = await page.context().cookies();
    const ak_bmsc = cookies.find((c) => c.name === 'ak_bmsc')?.value ?? '';
    const bm_sv = cookies.find((c) => c.name === 'bm_sv')?.value ?? '';

    if (ak_bmsc && bm_sv) {
      return { ak_bmsc, bm_sv };
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Timeout: cookies ak_bmsc e bm_sv nao encontrados apos ' + MAX_POLL_MS + 'ms');
}

async function main() {
  console.log('🚀 Iniciando renovacao de cookies EA/Akamai...');
  console.log('   Bootstrap URL:', BOOTSTRAP_URL);
  console.log('   Target URL   :', TARGET_URL);
  console.log('   Cookie service:', COOKIE_SERVICE_URL);

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080',
      '--lang=pt-BR',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'pt-BR',
      extraHTTPHeaders: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
      },
    });

    // Esconde marcadores de automacao antes de qualquer navegacao
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'pt', 'en'] });
      // @ts-ignore
      window.chrome = { runtime: {} };
    });

    const page = await context.newPage();

    // Estrategia: visitar homepage multiplas vezes para deixar o JS do Akamai rodar.
    // Evitar navegar para URL de API (retorna JSON e causa ERR_HTTP2_PROTOCOL_ERROR
    // com networkidle; alem disso o endpoint pode ser bloqueado para IPs de CI).

    // 1. Homepage — Akamai registra primeira visita e define ak_bmsc
    console.log('   [1/3] Navegando para homepage (primeira visita)...');
    await page.goto(BOOTSTRAP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await sleep(4_000);

    // 2. Segunda visita — Akamai avalia sensor data e define bm_sv
    console.log('   [2/3] Navegando para homepage (segunda visita)...');
    await page.goto(BOOTSTRAP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await sleep(4_000);

    // 3. Terceira visita — garante que bm_sv foi renovado
    console.log('   [3/3] Navegando para homepage (terceira visita)...');
    await page.goto(BOOTSTRAP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await sleep(3_000);

    // Polling ate os dois cookies estarem presentes
    console.log('   ⏳ Aguardando cookies...');
    const { ak_bmsc, bm_sv } = await waitForCookies(page);

    console.log('   ✅ Cookies obtidos:');
    console.log('      ak_bmsc =', ak_bmsc.substring(0, 20) + '...');
    console.log('      bm_sv   =', bm_sv.substring(0, 20) + '...');

    // POST para o cookie service
    const endpoint = `${COOKIE_SERVICE_URL}/api/cookies`;
    console.log('   📤 POST para', endpoint);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-secret': COOKIE_SERVICE_SECRET,
      },
      body: JSON.stringify({ ak_bmsc, bm_sv }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Cookie service retornou ${response.status}: ${body}`);
    }

    const result = await response.json();
    console.log('   ✅ Cookie service atualizado:', JSON.stringify(result));
    console.log('🎉 Renovacao concluida com sucesso!');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Falha na renovacao:', err.message ?? err);
  process.exit(1);
});
