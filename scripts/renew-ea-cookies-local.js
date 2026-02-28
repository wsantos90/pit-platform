#!/usr/bin/env node
// @ts-check
/**
 * Script LOCAL de renovacao de cookies EA/Akamai.
 * Executa na maquina do usuario (IP residencial) via Task Scheduler do Windows.
 *
 * Setup:
 *   1. npm install -g playwright && npx playwright install chromium
 *   2. Criar arquivo .env.local nesta pasta com COOKIE_SERVICE_URL e COOKIE_SERVICE_SECRET
 *   3. Agendar no Task Scheduler para rodar a cada 20 min
 *
 * Ou rodar manualmente:
 *   node scripts/renew-ea-cookies-local.js
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Carrega .env.local se existir
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

const { chromium } = require('playwright');

const COOKIE_SERVICE_URL = (process.env.COOKIE_SERVICE_URL ?? '').replace(/\/$/, '');
const COOKIE_SERVICE_SECRET = process.env.COOKIE_SERVICE_SECRET ?? '';
const BOOTSTRAP_URL = process.env.EA_COOKIE_BOOTSTRAP_URL ?? 'https://proclubs.ea.com';
const TARGET_URL =
  process.env.EA_COOKIE_TARGET_URL ??
  'https://proclubs.ea.com/api/fc/clubs/matches?platform=common-gen5&clubIds=637741&maxResultCount=20&matchType=friendlyMatch';

const TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 1_000;
const MAX_POLL_MS = 60_000;

if (!COOKIE_SERVICE_URL) {
  console.error('❌ COOKIE_SERVICE_URL nao definido. Crie o arquivo .env.local');
  console.error('   Exemplo:');
  console.error('   COOKIE_SERVICE_URL=https://cookie.menteembeta.com.br');
  console.error('   COOKIE_SERVICE_SECRET=seu-secret-aqui');
  process.exit(1);
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForCookies(page) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < MAX_POLL_MS) {
    const cookies = await page.context().cookies();
    const ak_bmsc = cookies.find((c) => c.name === 'ak_bmsc')?.value ?? '';
    const bm_sv = cookies.find((c) => c.name === 'bm_sv')?.value ?? '';

    if (ak_bmsc && bm_sv) {
      return { ak_bmsc, bm_sv };
    }

    // Log parcial para debug
    if (Date.now() - startedAt > 5_000 && Date.now() - startedAt < 6_000) {
      const found = cookies.map((c) => c.name).filter((n) => n.startsWith('ak_') || n.startsWith('bm'));
      console.log('   Debug cookies encontrados ate agora:', found.length > 0 ? found.join(', ') : 'nenhum');
    }

    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error('Timeout: cookies ak_bmsc e bm_sv nao encontrados apos ' + MAX_POLL_MS + 'ms');
}

async function main() {
  const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  console.log(`\n🚀 [${now}] Renovando cookies EA/Akamai...`);
  console.log('   Bootstrap URL:', BOOTSTRAP_URL);
  console.log('   Target URL   :', TARGET_URL);
  console.log('   Cookie service:', COOKIE_SERVICE_URL);

  // Usa o Microsoft Edge real instalado na maquina (channel: 'msedge').
  // O Edge tem fingerprint TLS/HTTP2 legitimo que o Akamai confia.
  // O Chromium bundled do Playwright e detectado como bot pelo Akamai.
  //
  // HEADLESS=false permite ver o browser — util para debug inicial.
  // Para Task Scheduler silencioso: HEADLESS pode ser omitido (padrao: headless true).
  const headless = process.env.HEADLESS !== 'false';

  const browser = await chromium.launch({
    channel: 'msedge',
    headless,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
      '--lang=pt-BR',
    ],
  });

  try {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'pt-BR',
    });

    // Sem addInitScript — deixar Edge se comportar naturalmente.
    // Modificar navigator.webdriver etc. e detectavel pelo Akamai como sinal de automacao.

    const page = await context.newPage();

    // Intercepta respostas para logar qualquer Set-Cookie do Akamai em tempo real
    page.on('response', (response) => {
      const setCookie = response.headers()['set-cookie'];
      if (setCookie) {
        const relevant = setCookie.split('\n').filter((c) => /ak_bmsc|bm_sv|bm_sz/.test(c));
        if (relevant.length > 0) {
          console.log('   🍪 Set-Cookie de', response.url().substring(0, 80));
          relevant.forEach((c) => console.log('     ', c.substring(0, 120)));
        }
      }
    });

    // 1. Homepage — Akamai registra primeira visita e define ak_bmsc
    console.log('   [1/3] Homepage (primeira visita)...');
    await page.goto(BOOTSTRAP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await sleep(4_000);

    // 2. Segunda visita — Akamai avalia sensor data
    console.log('   [2/3] Homepage (segunda visita)...');
    await page.goto(BOOTSTRAP_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
    await sleep(4_000);

    // 3. Navegacao real para a URL da API — Akamai so define bm_sv em requests
    //    com Sec-Fetch-Mode: navigate (nao em fetch/XHR).
    //    Com Edge real (channel: 'msedge'), page.goto() funciona corretamente.
    console.log('   [3/3] Navegando para URL da API EA (gera bm_sv)...');
    try {
      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
      console.log('   ℹ️  Navegacao concluida.');
    } catch (err) {
      // Erros de navegacao sao normais para endpoints JSON (sem HTML) —
      // o Akamai ja processou o request e definiu bm_sv antes do erro.
      console.log('   ⚠️  Erro de navegacao (normal para JSON):', err.message?.split('\n')[0] ?? err);
    }
    await sleep(4_000);

    console.log('   ⏳ Aguardando cookies Akamai...');
    const { ak_bmsc, bm_sv } = await waitForCookies(page);

    console.log('   ✅ Cookies obtidos:');
    console.log('      ak_bmsc =', ak_bmsc.substring(0, 25) + '...');
    console.log('      bm_sv   =', bm_sv.substring(0, 25) + '...');

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
    console.log('🎉 Renovacao concluida!\n');
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error('❌ Falha:', err.message ?? err);
  process.exit(1);
});
